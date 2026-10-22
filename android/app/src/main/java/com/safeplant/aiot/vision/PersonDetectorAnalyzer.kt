package com.safeplant.aiot.vision

import android.graphics.PointF
import android.graphics.RectF
import android.util.Log
import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.objects.DetectedObject
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
import com.google.mlkit.vision.objects.defaults.PredefinedCategory
import com.safeplant.aiot.data.model.DetectedPerson

private const val TAG = "PersonDetectorAnalyzer"

/**
 * Continuous CameraX ImageAnalysis analyzer running ML Kit on-device person detection.
 * Automatically evaluates whether detected persons intersect the restricted zone rectangle
 * (zoneX, zoneY, zoneW, zoneH) with consecutive-frame confirmation and hysteresis re-arming.
 */
class PersonDetectorAnalyzer(
    var confidenceThreshold: Float = 0.60f,
    var zoneX: Float = 0.20f,
    var zoneY: Float = 0.25f,
    var zoneW: Float = 0.60f,
    var zoneH: Float = 0.50f,
    var cooldownMs: Long = 15000L,
    private val onFrameAnalyzed: (List<DetectedPerson>, Boolean, Int) -> Unit,
    private val onIntrusionConfirmed: (peopleCount: Int, confidence: Float, zoneId: String) -> Unit
) : ImageAnalysis.Analyzer {

    @Volatile
    var isMonitoringActive: Boolean = true

    // ML Kit Object Detector configured for streaming continuous frames
    private val options = ObjectDetectorOptions.Builder()
        .setDetectorMode(ObjectDetectorOptions.STREAM_MODE)
        .enableClassification()
        .enableMultipleObjects()
        .build()

    private val detector = ObjectDetection.getClient(options)

    // Consecutive frame confirmation counters
    private var consecutiveZoneFrames = 0
    private var consecutiveExitFrames = 0
    private val REQUIRED_CONFIRMATION_FRAMES = 3
    private val REQUIRED_EXIT_FRAMES = 3

    // Intrusion state & cooldown tracking
    private var hasTriggeredCurrentIntrusion = false
    private var lastIntrusionEpoch = 0L

    fun updateRestrictedZone(x: Float, y: Float, w: Float, h: Float) {
        zoneX = x.coerceIn(0f, 0.9f)
        zoneY = y.coerceIn(0f, 0.9f)
        zoneW = w.coerceIn(0.1f, 1f - zoneX)
        zoneH = h.coerceIn(0.1f, 1f - zoneY)
    }

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        if (!isMonitoringActive) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val inputImage = InputImage.fromMediaImage(mediaImage, rotationDegrees)

        detector.process(inputImage)
            .addOnSuccessListener { detectedObjects ->
                processDetectedObjects(detectedObjects, inputImage.width, inputImage.height)
            }
            .addOnFailureListener { error ->
                Log.e(TAG, "ML Kit inference failed: ${error.message}", error)
            }
            .addOnCompleteListener {
                // ALWAYS close ImageProxy to return frame buffer to CameraX
                imageProxy.close()
            }
    }

    private fun processDetectedObjects(
        objects: List<DetectedObject>,
        frameWidth: Int,
        frameHeight: Int
    ) {
        val detectedPersons = mutableListOf<DetectedPerson>()
        var highestConfidence = 0f
        var intrudersInZoneCount = 0

        val zoneLeft = zoneX
        val zoneTop = zoneY
        val zoneRight = zoneX + zoneW
        val zoneBottom = zoneY + zoneH

        for ((idx, obj) in objects.withIndex()) {
            val isPerson = isPersonEntity(obj)
            val confidence = extractConfidence(obj)

            if (isPerson && confidence >= confidenceThreshold) {
                val box = obj.boundingBox
                // Normalized bounding box in range [0f..1f]
                val normBox = RectF(
                    (box.left.toFloat() / frameWidth).coerceIn(0f, 1f),
                    (box.top.toFloat() / frameHeight).coerceIn(0f, 1f),
                    (box.right.toFloat() / frameWidth).coerceIn(0f, 1f),
                    (box.bottom.toFloat() / frameHeight).coerceIn(0f, 1f)
                )

                // Bottom center point (feet reference) and centroid
                val bottomCenter = PointF(normBox.centerX(), normBox.bottom)
                val center = PointF(normBox.centerX(), normBox.centerY())

                // Overlap test: bounding box intersects zone OR feet/center inside zone
                val boxOverlap = (normBox.left < zoneRight && normBox.right > zoneLeft &&
                        normBox.top < zoneBottom && normBox.bottom > zoneTop)
                val feetInZone = (bottomCenter.x in zoneLeft..zoneRight && bottomCenter.y in zoneTop..zoneBottom)
                val centerInZone = (center.x in zoneLeft..zoneRight && center.y in zoneTop..zoneBottom)

                val isInZone = boxOverlap || feetInZone || centerInZone

                if (isInZone) {
                    intrudersInZoneCount++
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence
                    }
                }

                detectedPersons.add(
                    DetectedPerson(
                        id = obj.trackingId ?: idx,
                        boundingBox = normBox,
                        confidence = confidence,
                        isInRestrictedZone = isInZone
                    )
                )
            }
        }

        // Automatic State Machine: Consecutive-frame confirmation & Hysteresis Re-arm
        val hasIntruder = intrudersInZoneCount > 0

        if (hasIntruder) {
            consecutiveZoneFrames++
            consecutiveExitFrames = 0

            // Trigger when confirmed over consecutive frames and cooldown passed
            if (consecutiveZoneFrames >= REQUIRED_CONFIRMATION_FRAMES) {
                val now = System.currentTimeMillis()
                val canTrigger = !hasTriggeredCurrentIntrusion || (now - lastIntrusionEpoch >= cooldownMs)

                if (canTrigger) {
                    hasTriggeredCurrentIntrusion = true
                    lastIntrusionEpoch = now
                    val alertConf = if (highestConfidence > 0f) highestConfidence else 0.88f
                    Log.i(TAG, "CONFIRMED INTRUSION! Count: $intrudersInZoneCount, Conf: $alertConf")
                    onIntrusionConfirmed(intrudersInZoneCount, alertConf, "zone_perimeter_01")
                }
            }
        } else {
            consecutiveExitFrames++
            consecutiveZoneFrames = 0

            // Re-arm when area has been clear for consecutive frames
            if (consecutiveExitFrames >= REQUIRED_EXIT_FRAMES) {
                if (hasTriggeredCurrentIntrusion) {
                    Log.i(TAG, "Restricted zone cleared. Re-arming automatic intrusion detector.")
                }
                hasTriggeredCurrentIntrusion = false
            }
        }

        // Notify UI for real-time bounding box and HUD display
        val isAlarmActive = hasIntruder || hasTriggeredCurrentIntrusion
        onFrameAnalyzed(detectedPersons, isAlarmActive, intrudersInZoneCount)
    }

    private fun isPersonEntity(obj: DetectedObject): Boolean {
        if (obj.labels.isEmpty()) {
            // General object stream detection candidate
            return true
        }
        for (label in obj.labels) {
            val text = label.text
            if (text.equals("Person", ignoreCase = true) ||
                text.equals("Human", ignoreCase = true) ||
                text.equals(PredefinedCategory.PERSON, ignoreCase = true)) {
                return true
            }
        }
        return false
    }

    private fun extractConfidence(obj: DetectedObject): Float {
        val personLabel = obj.labels.firstOrNull {
            it.text.equals("Person", ignoreCase = true) ||
            it.text.equals("Human", ignoreCase = true) ||
            it.text.equals(PredefinedCategory.PERSON, ignoreCase = true)
        } ?: obj.labels.firstOrNull()
        return personLabel?.confidence ?: 0.85f
    }

    fun close() {
        try {
            detector.close()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to close ML Kit detector: ${e.message}")
        }
    }
}
