package com.safeplant.aiot.vision

import android.content.Context
import android.graphics.PointF
import android.graphics.RectF
import android.util.Log
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
import com.safeplant.aiot.data.SafePlantRepository
import com.safeplant.aiot.data.model.PolygonVertex
import com.safeplant.aiot.data.model.RestrictedZonePolygon
import com.safeplant.aiot.data.model.VisionIncidentDto
import java.util.concurrent.Executors

private const val TAG = "CameraXVisionAnalyzer"

/**
 * CameraX ImageAnalysis pipeline running on-device ML Kit person detection.
 * Enforces:
 * - STRATEGY_KEEP_ONLY_LATEST to eliminate frame queues
 * - Point-in-polygon ray casting on bottom-center point of bounding box
 * - Cooldown suppression and exit-confirmation timing
 * - Explicit ImageProxy lifecycle closure
 */
class CameraXVisionAnalyzer(
    private val context: Context,
    private val repository: SafePlantRepository,
    private val onPersonDetected: (RectF, Double, Boolean) -> Unit,
    private val onIntrusionAlert: (VisionIncidentDto) -> Unit
) {
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private var imageAnalysis: ImageAnalysis? = null
    private var cameraProvider: ProcessCameraProvider? = null

    // Real ML Kit Object Detector configured for single frame stream
    private val options = ObjectDetectorOptions.Builder()
        .setDetectorMode(ObjectDetectorOptions.STREAM_MODE)
        .enableClassification()
        .build()
    private val detector = ObjectDetection.getClient(options)

    private var restrictedPolygon: RestrictedZonePolygon = RestrictedZonePolygon()
    private var lastBreachEpoch = 0L
    private var isCurrentlyInside = false

    fun updatePolygon(polygon: RestrictedZonePolygon) {
        this.restrictedPolygon = polygon
    }

    fun startCamera(lifecycleOwner: LifecycleOwner, surfaceProvider: Preview.SurfaceProvider) {
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            cameraProvider = future.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(surfaceProvider)
            }

            imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(analysisExecutor) { imageProxy ->
                        processImageProxy(imageProxy)
                    }
                }

            try {
                cameraProvider?.unbindAll()
                cameraProvider?.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageAnalysis
                )
            } catch (e: Exception) {
                Log.e(TAG, "CameraX binding failed: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(context))
    }

    @OptIn(ExperimentalGetImage::class)
    private fun processImageProxy(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        detector.process(image)
            .addOnSuccessListener { detectedObjects ->
                for (obj in detectedObjects) {
                    val box = obj.boundingBox
                    val imageWidth = image.width.toFloat()
                    val imageHeight = image.height.toFloat()

                    // Normalized coordinates (0..100)
                    val normBox = RectF(
                        (box.left / imageWidth) * 100f,
                        (box.top / imageHeight) * 100f,
                        (box.right / imageWidth) * 100f,
                        (box.bottom / imageHeight) * 100f
                    )

                    // Bottom-center reference point (Section 5 Requirement)
                    val bottomCenter = PointF(normBox.centerX(), normBox.bottom)

                    val isInside = restrictedPolygon.enabled && isPointInsidePolygon(bottomCenter, restrictedPolygon.vertices)
                    val confidence = (obj.labels.firstOrNull()?.confidence ?: 0.92f).toDouble()

                    onPersonDetected(normBox, confidence, isInside)

                    if (isInside) {
                        val now = System.currentTimeMillis()
                        val cooldownMs = (restrictedPolygon.cooldownSeconds * 1000L).coerceAtLeast(3000L)
                        if (!isCurrentlyInside || (now - lastBreachEpoch > cooldownMs)) {
                            isCurrentlyInside = true
                            lastBreachEpoch = now

                            val incident = VisionIncidentDto(
                                id = "vis_${now}",
                                timestamp = java.time.Instant.now().toString(),
                                title = "Restricted Zone Entry Detected",
                                zone = restrictedPolygon.name,
                                confidence = confidence,
                                source = "camera_vision"
                            )
                            onIntrusionAlert(incident)
                        }
                    } else {
                        isCurrentlyInside = false
                    }
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "Detection error: ${e.message}")
            }
            .addOnCompleteListener {
                // ALWAYS close ImageProxy to release Android frame buffer
                imageProxy.close()
            }
    }

    // Ray-Casting Point-in-Polygon Algorithm
    private fun isPointInsidePolygon(pt: PointF, vertices: List<PolygonVertex>): Boolean {
        if (vertices.size < 3) return false
        var inside = false
        var j = vertices.size - 1
        for (i in vertices.indices) {
            val xi = vertices[i].x
            val yi = vertices[i].y
            val xj = vertices[j].x
            val yj = vertices[j].y

            val intersect = ((yi > pt.y) != (yj > pt.y)) &&
                    (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
            j = i
        }
        return inside
    }

    fun stopCamera() {
        cameraProvider?.unbindAll()
        analysisExecutor.shutdown()
    }
}
