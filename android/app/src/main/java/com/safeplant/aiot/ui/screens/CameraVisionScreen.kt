package com.safeplant.aiot.ui.screens

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import android.view.ViewGroup
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.safeplant.aiot.data.SafePlantRepository
import com.safeplant.aiot.data.model.DetectedPerson
import com.safeplant.aiot.notification.NotificationHelper
import com.safeplant.aiot.vision.PersonDetectorAnalyzer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.concurrent.Executors

private const val TAG = "CameraVisionScreen"

/**
 * CameraVisionScreen
 * Provides live CameraX optical perimeter monitoring with ML Kit on-device person detection.
 * Automatically evaluates whether detected persons enter a user-defined restricted zone.
 * Automatically fires asynchronous backend events to /api/ai/events and posts system notifications
 * via NotificationHelper, with consecutive-frame confirmation and hysteresis re-arming.
 */
@Composable
fun CameraVisionScreen(
    onIntrusionDetected: (Float, String) -> Unit,
    modifier: Modifier = Modifier,
    repository: SafePlantRepository = remember { SafePlantRepository.getInstance() }
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { granted ->
            hasCameraPermission = granted
        }
    )

    // State for monitoring and real-time detection
    var isMonitoringActive by remember { mutableStateOf(true) }
    var detectedPersons by remember { mutableStateOf<List<DetectedPerson>>(emptyList()) }
    var intrusionAlarmActive by remember { mutableStateOf(false) }
    var intrudersInZoneCount by remember { mutableIntStateOf(0) }
    var confidenceThreshold by remember { mutableFloatStateOf(0.60f) }
    var lastAlertTimestamp by remember { mutableLongStateOf(0L) }
    var lastEventMessage by remember { mutableStateOf("No intrusions detected. Perimeter secure.") }

    // User-configured restricted boundary (normalized 0f..1f coordinates: zoneX, zoneY, zoneW, zoneH)
    var zoneX by remember { mutableFloatStateOf(0.20f) }
    var zoneY by remember { mutableFloatStateOf(0.25f) }
    var zoneW by remember { mutableFloatStateOf(0.60f) }
    var zoneH by remember { mutableFloatStateOf(0.50f) }

    // CameraX and Analyzer handles
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val analyzer = remember {
        PersonDetectorAnalyzer(
            confidenceThreshold = confidenceThreshold,
            zoneX = zoneX,
            zoneY = zoneY,
            zoneW = zoneW,
            zoneH = zoneH,
            cooldownMs = 15000L,
            onFrameAnalyzed = { persons, isAlarm, inZoneCount ->
                detectedPersons = persons
                intrusionAlarmActive = isAlarm
                intrudersInZoneCount = inZoneCount
            },
            onIntrusionConfirmed = { peopleCount, confidence, zoneId ->
                // AUTOMATIC DETECTION DISPATCH
                val timestamp = Instant.now().toString()
                lastAlertTimestamp = System.currentTimeMillis()
                lastEventMessage = "Automatic intrusion detected: $peopleCount person(s) at ${(confidence * 100).toInt()}% conf"

                // 1. Post notification via NotificationHelper
                NotificationHelper.showIntrusionAlert(
                    context = context,
                    confidence = confidence,
                    zone = "Restricted Industrial Zone"
                )

                // 2. Report asynchronously to FastAPI /api/ai/events with source="android_camera"
                CoroutineScope(Dispatchers.IO).launch {
                    val result = repository.reportAiIntrusionEvent(
                        polygonId = zoneId,
                        peopleCount = peopleCount,
                        confidence = confidence,
                        source = "android_camera",
                        isHardware = false,
                        timestamp = timestamp
                    )
                    result.onSuccess {
                        Log.i(TAG, "Successfully reported real camera intrusion event to backend")
                    }.onFailure { err ->
                        Log.e(TAG, "Error posting AI intrusion event: ${err.message}")
                    }
                }

                // 3. Notify parent composable to update in-app incident audit state
                onIntrusionDetected(confidence, "Restricted Industrial Zone")
            }
        )
    }

    // Keep analyzer config in sync with UI states
    LaunchedEffect(isMonitoringActive) {
        analyzer.isMonitoringActive = isMonitoringActive
    }
    LaunchedEffect(zoneX, zoneY, zoneW, zoneH) {
        analyzer.updateRestrictedZone(zoneX, zoneY, zoneW, zoneH)
    }
    LaunchedEffect(confidenceThreshold) {
        analyzer.confidenceThreshold = confidenceThreshold
    }

    DisposableEffect(Unit) {
        onDispose {
            analyzer.close()
            cameraExecutor.shutdown()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(14.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 1. Header with Status Chip
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "AI Optical Vision",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Continuous automated perimeter monitoring",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }

            Surface(
                color = when {
                    !isMonitoringActive -> Color(0xFF334155)
                    intrusionAlarmActive -> Color(0xFFEF4444)
                    else -> Color(0xFF10B981)
                },
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = when {
                        !isMonitoringActive -> "DISARMED"
                        intrusionAlarmActive -> "INTRUSION DETECTED"
                        else -> "ARMED & SECURE"
                    },
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                )
            }
        }

        // 2. Alarm Banner (Appears automatically during confirmed intrusion)
        AnimatedVisibility(
            visible = intrusionAlarmActive && isMonitoringActive,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Surface(
                color = Color(0xFFB91C1C),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Alert",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Column {
                        Text(
                            text = "CRITICAL: UNAUTHORIZED PERSON IN RESTRICTED PERIMETER",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "$intrudersInZoneCount person(s) inside boundary. Event dispatched to backend & system notification posted.",
                            color = Color(0xFFFECACA),
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        // 3. Live Camera Viewport with PreviewView and Canvas Overlay
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(340.dp)
                .background(Color(0xFF020617), shape = RoundedCornerShape(12.dp))
                .border(
                    width = if (intrusionAlarmActive) 2.5.dp else 1.dp,
                    color = if (intrusionAlarmActive) Color(0xFFEF4444) else Color(0xFF1E293B),
                    shape = RoundedCornerShape(12.dp)
                )
        ) {
            if (!hasCameraPermission) {
                // Permission Request Fallback
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = null,
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Camera Permission Required",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "SafePlant requires camera access for continuous on-device person detection and restricted zone perimeter enforcement.",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        lineHeight = 16.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Grant Camera Permission", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                // Real CameraX PreviewView bound to camera lifecycle
                AndroidView(
                    factory = { ctx ->
                        val previewView = PreviewView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            scaleType = PreviewView.ScaleType.FILL_CENTER
                            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                        }

                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        cameraProviderFuture.addListener({
                            val cameraProvider = cameraProviderFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }

                            val imageAnalysis = ImageAnalysis.Builder()
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                                .build()
                                .also {
                                    it.setAnalyzer(cameraExecutor, analyzer)
                                }

                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    CameraSelector.DEFAULT_BACK_CAMERA,
                                    preview,
                                    imageAnalysis
                                )
                            } catch (e: Exception) {
                                Log.e(TAG, "CameraX binding failed: ${e.message}", e)
                            }
                        }, ContextCompat.getMainExecutor(ctx))

                        previewView
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Overlay Canvas: Restricted Zone Rectangle & Detected Person Bounding Boxes
                Canvas(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTapGestures { offset ->
                                // Tap to reposition center of restricted zone
                                val normX = offset.x / size.width
                                val normY = offset.y / size.height
                                zoneX = (normX - zoneW / 2f).coerceIn(0.05f, 1f - zoneW - 0.05f)
                                zoneY = (normY - zoneH / 2f).coerceIn(0.05f, 1f - zoneH - 0.05f)
                            }
                        }
                ) {
                    val w = size.width
                    val h = size.height

                    // 1. Draw Reticle Grid
                    drawLine(
                        color = Color(0x2210B981),
                        start = Offset(0f, h / 2),
                        end = Offset(w, h / 2),
                        strokeWidth = 1f
                    )
                    drawLine(
                        color = Color(0x2210B981),
                        start = Offset(w / 2, 0f),
                        end = Offset(w / 2, h),
                        strokeWidth = 1f
                    )

                    // 2. Draw Restricted Zone Rectangle
                    val rLeft = zoneX * w
                    val rTop = zoneY * h
                    val rWidth = zoneW * w
                    val rHeight = zoneH * h

                    val zoneBgColor = if (intrusionAlarmActive) Color(0x44EF4444) else Color(0x22F59E0B)
                    val zoneStrokeColor = if (intrusionAlarmActive) Color(0xFFEF4444) else Color(0xFFF59E0B)

                    drawRect(
                        color = zoneBgColor,
                        topLeft = Offset(rLeft, rTop),
                        size = Size(rWidth, rHeight)
                    )
                    drawRect(
                        color = zoneStrokeColor,
                        topLeft = Offset(rLeft, rTop),
                        size = Size(rWidth, rHeight),
                        style = Stroke(
                            width = 2.5.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 10f), 0f)
                        )
                    )

                    // 3. Draw Detected Person Bounding Boxes
                    if (isMonitoringActive) {
                        for (person in detectedPersons) {
                            val pLeft = person.boundingBox.left * w
                            val pTop = person.boundingBox.top * h
                            val pWidth = (person.boundingBox.right - person.boundingBox.left) * w
                            val pHeight = (person.boundingBox.bottom - person.boundingBox.top) * h

                            val boxColor = if (person.isInRestrictedZone) Color(0xFFEF4444) else Color(0xFF10B981)

                            // Bounding Box
                            drawRect(
                                color = boxColor,
                                topLeft = Offset(pLeft, pTop),
                                size = Size(pWidth, pHeight),
                                style = Stroke(width = 2.5.dp.toPx())
                            )

                            // Corner highlight accents
                            val cornerLen = 14f
                            // Top-left
                            drawLine(boxColor, Offset(pLeft, pTop), Offset(pLeft + cornerLen, pTop), strokeWidth = 4f)
                            drawLine(boxColor, Offset(pLeft, pTop), Offset(pLeft, pTop + cornerLen), strokeWidth = 4f)
                            // Top-right
                            drawLine(boxColor, Offset(pLeft + pWidth, pTop), Offset(pLeft + pWidth - cornerLen, pTop), strokeWidth = 4f)
                            drawLine(boxColor, Offset(pLeft + pWidth, pTop), Offset(pLeft + pWidth, pTop + cornerLen), strokeWidth = 4f)
                        }
                    }
                }

                // HUD Overlay Stats & Labels
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Surface(
                            color = Color(0xAA020617),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "STREAM: ACTIVE | DETECTIONS: ${detectedPersons.size} (${intrudersInZoneCount} IN ZONE)",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                color = if (intrudersInZoneCount > 0) Color(0xFFEF4444) else Color(0xFF10B981),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }

                        Surface(
                            color = Color(0xAA020617),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "ZONE: [${(zoneX * 100).toInt()}%, ${(zoneY * 100).toInt()}%]",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Color(0xFFF59E0B),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }
                    }

                    // Detection badges
                    if (isMonitoringActive && detectedPersons.isNotEmpty()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            detectedPersons.take(3).forEach { person ->
                                Surface(
                                    color = if (person.isInRestrictedZone) Color(0xFFDC2626) else Color(0xFF065F46),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = "${if (person.isInRestrictedZone) "INTRUDER" else "PERSON"}: ${(person.confidence * 100).toInt()}%",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }

                    Text(
                        text = "Tap camera feed to reposition restricted boundary center.",
                        fontSize = 10.5.sp,
                        color = Color(0xFF94A3B8)
                    )
                }
            }
        }

        // 4. Monitoring Controls & Calibration Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Automatic Monitoring Toggle Switch
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = if (isMonitoringActive) "Automated Detection Armed" else "Detection Standby",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Automatic entry detection (no tap/confirmation required)",
                            fontSize = 11.5.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }

                    Switch(
                        checked = isMonitoringActive,
                        onCheckedChange = { active ->
                            isMonitoringActive = active
                            if (!active) {
                                detectedPersons = emptyList()
                                intrusionAlarmActive = false
                                intrudersInZoneCount = 0
                            }
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF10B981),
                            checkedTrackColor = Color(0xFF065F46)
                        )
                    )
                }

                HorizontalDivider(color = Color(0xFF334155))

                // Confidence Threshold Slider
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Confidence Threshold",
                            fontSize = 12.sp,
                            color = Color(0xFFE2E8F0)
                        )
                        Text(
                            text = "${(confidenceThreshold * 100).toInt()}%",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF10B981)
                        )
                    }
                    Slider(
                        value = confidenceThreshold,
                        onValueChange = { confidenceThreshold = it },
                        valueRange = 0.40f..0.90f,
                        steps = 9,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF10B981),
                            activeTrackColor = Color(0xFF10B981),
                            inactiveTrackColor = Color(0xFF334155)
                        )
                    )
                }

                // Status message
                Text(
                    text = "Status: $lastEventMessage",
                    fontSize = 11.sp,
                    color = Color(0xFF94A3B8),
                    fontFamily = FontFamily.Monospace
                )

                // 5. Separate Distinct Manual Test Intrusion Button
                Button(
                    onClick = {
                        // MANUAL TEST ONLY: sends simulated_ui with is_hardware=false
                        val timestamp = Instant.now().toString()
                        val testConf = 0.94f
                        lastAlertTimestamp = System.currentTimeMillis()
                        lastEventMessage = "Simulated intrusion test triggered manually."

                        NotificationHelper.showIntrusionAlert(
                            context = context,
                            confidence = testConf,
                            zone = "Restricted Industrial Zone (Test)"
                        )

                        CoroutineScope(Dispatchers.IO).launch {
                            repository.reportAiIntrusionEvent(
                                polygonId = "zone_perimeter_test",
                                peopleCount = 1,
                                confidence = testConf,
                                source = "simulated_ui",
                                isHardware = false,
                                timestamp = timestamp
                            )
                        }

                        onIntrusionDetected(testConf, "Restricted Industrial Zone (Test)")
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
                ) {
                    Icon(
                        imageVector = Icons.Default.BugReport,
                        contentDescription = "Test",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "TRIGGER TEST INTRUSION (SIMULATED)",
                        color = Color(0xFFE2E8F0),
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Disclaimer
                Surface(
                    color = Color(0xFF0F172A),
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Real intrusions trigger automatically without clicking. Spam prevention enforces a 15-second cooldown and 3-frame confirmation window. Re-arms when zone is clear.",
                        fontSize = 10.5.sp,
                        color = Color(0xFF64748B),
                        modifier = Modifier.padding(8.dp),
                        lineHeight = 14.sp
                    )
                }
            }
        }
    }
}
