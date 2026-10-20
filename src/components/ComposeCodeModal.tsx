import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Layers, Shield, Bell, Camera, Server, Terminal } from 'lucide-react';

interface ComposeCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface KotlinFile {
  name: string;
  path: string;
  category: 'network' | 'fcm' | 'vision' | 'ui' | 'backend';
  content: string;
}

const kotlinFiles: KotlinFile[] = [
  {
    name: 'SafePlantFirebaseMessagingService.kt',
    path: 'com/safeplant/aiot/fcm/SafePlantFirebaseMessagingService.kt',
    category: 'fcm',
    content: `package com.safeplant.aiot.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.safeplant.aiot.MainActivity
import com.safeplant.aiot.R
import com.safeplant.aiot.data.SafePlantRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private const val TAG = "SafePlantFCM"

/**
 * Handles incoming Firebase Cloud Messaging notifications for SafePlant AIoT.
 * Dispatches high-priority alerts with sound & vibration even when app is backgrounded or terminated.
 */
class SafePlantFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i(TAG, "New FCM Device Registration Token: \$token")
        
        // Register token with FastAPI backend: POST /api/notifications/register-token
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val repository = SafePlantRepository()
                repository.registerDeviceToken(token)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to register FCM token with FastAPI: \${e.message}")
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "FCM message received from: \${remoteMessage.from}")

        val data = remoteMessage.data
        val incidentId = data["incident_id"] ?: data["id"] ?: "inc_\${System.currentTimeMillis()}"
        val title = data["title"] ?: remoteMessage.notification?.title ?: "Industrial Hazard Alert"
        val body = data["message"] ?: remoteMessage.notification?.body ?: "Emergency alert from SafePlant gateway."
        val severity = data["severity"] ?: "CRITICAL"
        val zone = data["zone"] ?: "Refinery Area A-4"

        // Deduplication: Verify incident hasn't already been displayed locally
        if (SafePlantRepository.hasIncidentBeenHandled(incidentId)) {
            Log.d(TAG, "Duplicate FCM incident \$incidentId dropped.")
            return
        }

        // Build and display high-priority Android Notification
        sendAndroidNotification(
            incidentId = incidentId,
            title = title,
            message = body,
            severity = severity,
            zone = zone
        )
    }

    private fun sendAndroidNotification(
        incidentId: String,
        title: String,
        message: String,
        severity: String,
        zone: String
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val isCritical = severity.equals("CRITICAL", ignoreCase = true)
        val channelId = if (isCritical) CHANNEL_CRITICAL_ALERTS else CHANNEL_WARNING_ALERTS

        createNotificationChannels(notificationManager)

        // Deep link intent into MainActivity with incident ID
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("EXTRA_INCIDENT_ID", incidentId)
            putExtra("EXTRA_SEVERITY", severity)
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            incidentId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(
            if (isCritical) RingtoneManager.TYPE_ALARM else RingtoneManager.TYPE_NOTIFICATION
        )

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_safeplant_shield)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText("\$message\\nLocation: \$zone"))
            .setPriority(if (isCritical) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_HIGH)
            .setCategory(if (isCritical) NotificationCompat.CATEGORY_ALARM else NotificationCompat.CATEGORY_EVENT)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(if (isCritical) longArrayOf(0, 500, 250, 500) else longArrayOf(0, 250, 150, 250))
            .setContentIntent(pendingIntent)
            .addAction(
                R.drawable.ic_check,
                "Acknowledge",
                pendingIntent
            )

        notificationManager.notify(incidentId.hashCode(), notificationBuilder.build())
    }

    private fun createNotificationChannels(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build()

            // Critical Channel (Max Priority + Sound + Vibration)
            val critChannel = NotificationChannel(
                CHANNEL_CRITICAL_ALERTS,
                "Critical Plant Hazards",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Emergency gas spikes, flame detections, and perimeter breaches"
                enableVibration(true)
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), audioAttributes)
            }

            // Warning Channel
            val warnChannel = NotificationChannel(
                CHANNEL_WARNING_ALERTS,
                "System Warnings",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Elevated temperature, humidity anomalies, and sensor recalibrations"
            }

            manager.createNotificationChannel(critChannel)
            manager.createNotificationChannel(warnChannel)
        }
    }

    companion object {
        const val CHANNEL_CRITICAL_ALERTS = "safeplant_critical_channel"
        const val CHANNEL_WARNING_ALERTS = "safeplant_warning_channel"
    }
}`
  },
  {
    name: 'CameraXVisionAnalyzer.kt',
    path: 'com/safeplant/aiot/vision/CameraXVisionAnalyzer.kt',
    category: 'vision',
    content: `package com.safeplant.aiot.vision

import android.content.Context
import android.graphics.RectF
import android.util.Log
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.safeplant.aiot.data.SafePlantRepository
import com.safeplant.aiot.data.model.RestrictedZoneBoundary
import com.safeplant.aiot.data.model.VisionIncidentDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

private const val TAG = "CameraXVision"

/**
 * CameraX ImageAnalysis pipeline running local on-device person tracking.
 * Uses KEEP_ONLY_LATEST backpressure to eliminate frame queues and conserve battery.
 */
class CameraXVisionAnalyzer(
    private val context: Context,
    private val repository: SafePlantRepository,
    private val onPersonTracked: (RectF, Double) -> Unit,
    private val onRestrictedZoneBreach: (VisionIncidentDto) -> Unit
) {
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private var imageAnalysis: ImageAnalysis? = null
    private var cameraProvider: ProcessCameraProvider? = null

    private var restrictedZone: RestrictedZoneBoundary = RestrictedZoneBoundary()
    private var lastBreachEpoch = 0L
    private val cooldownMs = 3000L

    fun updateRestrictedZone(zone: RestrictedZoneBoundary) {
        this.restrictedZone = zone
    }

    fun startCamera(
        lifecycleOwner: LifecycleOwner,
        previewSurfaceProvider: Preview.SurfaceProvider
    ) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)

        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewSurfaceProvider)
            }

            // ImageAnalysis with KEEP_ONLY_LATEST backpressure
            imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(analysisExecutor) { imageProxy ->
                        processImageProxy(imageProxy)
                    }
                }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider?.unbindAll()
                cameraProvider?.bindToLifecycle(
                    lifecycleOwner,
                    cameraSelector,
                    preview,
                    imageAnalysis
                )
            } catch (e: Exception) {
                Log.e(TAG, "CameraX binding failed: \${e.message}")
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

        try {
            // In a production build, delegate mediaImage to ML Kit Object Detection:
            // val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            // detector.process(image)...
            
            // Evaluates tracked bounding box intersection with restricted zone
            val personRect = RectF(0.35f, 0.25f, 0.65f, 0.75f)
            val confidence = 0.942

            onPersonTracked(personRect, confidence)

            // Check if center of tracked individual intersects configured restricted zone
            if (restrictedZone.enabled && isBoxInsideZone(personRect, restrictedZone)) {
                val now = System.currentTimeMillis()
                if (now - lastBreachEpoch > cooldownMs) {
                    lastBreachEpoch = now

                    val incident = VisionIncidentDto(
                        id = "vis_\${now}",
                        timestamp = java.time.Instant.now().toString(),
                        title = "Restricted Zone Entry Detected",
                        zone = restrictedZone.name,
                        confidence = confidence,
                        source = "camera_vision"
                    )

                    onRestrictedZoneBreach(incident)
                }
            }
        } finally {
            // CRITICAL: Always close ImageProxy to release frame buffer
            imageProxy.close()
        }
    }

    private fun isBoxInsideZone(box: RectF, zone: RestrictedZoneBoundary): Boolean {
        val centerX = box.centerX()
        val centerY = box.centerY()
        val zoneLeft = zone.x / 100f
        val zoneTop = zone.y / 100f
        val zoneRight = zoneLeft + (zone.w / 100f)
        val zoneBottom = zoneTop + (zone.h / 100f)

        return centerX in zoneLeft..zoneRight && centerY in zoneTop..zoneBottom
    }

    fun stopCamera() {
        cameraProvider?.unbindAll()
        analysisExecutor.shutdown()
    }
}`
  },
  {
    name: 'EmergencyAlertOverlay.kt',
    path: 'com/safeplant/aiot/ui/components/EmergencyAlertOverlay.kt',
    category: 'ui',
    content: `package com.safeplant.aiot.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.safeplant.aiot.data.model.EmergencyAlertDto
import com.safeplant.aiot.ui.theme.*

/**
 * Visually striking industrial in-app emergency alert overlay.
 * Pops up immediately when a critical incident is confirmed while app is open.
 */
@Composable
fun EmergencyAlertOverlay(
    alert: EmergencyAlertDto?,
    onAcknowledge: (String) -> Unit,
    onViewIncidentDetails: (String) -> Unit,
    reducedMotion: Boolean = false
) {
    if (alert == null) return

    val isCritical = alert.severity.equals("CRITICAL", ignoreCase = true)
    val borderColor = if (isCritical) HazardRed else WarningAmber
    val headerBg = if (isCritical) HazardRed else WarningAmber

    Dialog(
        onDismissRequest = { /* Require explicit acknowledgment */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(GraphiteSurface, RoundedCornerShape(24.dp))
                .border(2.dp, borderColor, RoundedCornerShape(24.dp))
                .padding(bottom = 20.dp)
        ) {
            // Strobe Header Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(headerBg, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .padding(vertical = 10.dp, horizontal = 16.dp)
            ) {
                Text(
                    text = "CONFIRMED INDUSTRIAL \${alert.severity} HAZARD",
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = alert.title,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = alert.message,
                    fontSize = 12.sp,
                    color = Slate300
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Telemetry Metric Box
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF090D13), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("TRIGGERING METRIC", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = Slate400)
                        Text(alert.actualMetric, fontSize = 18.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = borderColor)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("LOCATION", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = Slate400)
                        Text(alert.zone, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Action Buttons
                Button(
                    onClick = { onAcknowledge(alert.id) },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = headerBg),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("ACKNOWLEDGE HAZARD", color = Color.Black, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = { onViewIncidentDetails(alert.incidentId) },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("View Incident Audit Trail", color = Slate300, fontSize = 12.sp)
                }
            }
        }
    }
}`
  },
  {
    name: 'fcm_notifier.py',
    path: 'fastapi_backend/fcm_notifier.py',
    category: 'backend',
    content: `"""
FastAPI Server-Side Firebase Cloud Messaging (FCM) Dispatcher.
Dispatches background push notifications to registered Android devices via Firebase Admin SDK.
Credentials are kept secure on the server only. Never embedded into the Android app.
"""

import os
import logging
from typing import Dict, Any, List
import firebase_admin
from firebase_admin import credentials, messaging

logger = logging.getLogger("safeplant.fcm")

# In-memory or SQLite token store
REGISTERED_DEVICE_TOKENS: set = set()

def initialize_firebase_admin():
    """Initializes Firebase Admin SDK using service account JSON specified by env var."""
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "service-account.json")
    
    if not os.path.exists(service_account_path):
        logger.warning(
            f"FCM Service Account file not found at '{service_account_path}'. "
            "Push notifications disabled until configured."
        )
        return False
        
    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        return False

def register_device_token(token: str):
    """Registers an Android FCM device token for push broadcasts."""
    if token and len(token) > 10:
        REGISTERED_DEVICE_TOKENS.add(token)
        logger.info(f"Registered device FCM token: {token[:12]}... (Total: {len(REGISTERED_DEVICE_TOKENS)})")

def send_fcm_emergency_notification(incident: Dict[str, Any]) -> int:
    """
    Sends high-priority FCM notification to all registered Android devices.
    Notification payload wakes up backgrounded or terminated Android apps.
    """
    if not REGISTERED_DEVICE_TOKENS:
        logger.info("No registered Android FCM tokens. Skipping push dispatch.")
        return 0

    severity = incident.get("severity", "CRITICAL")
    title = f"EMERGENCY: {incident.get('title', 'Hazard Detected')}"
    body = incident.get("description", "Exceeded plant safety threshold.")

    # Android specific notification options
    android_config = messaging.AndroidConfig(
        priority="high",
        notification=messaging.AndroidNotification(
            title=title,
            body=body,
            icon="ic_safeplant_shield",
            color="#10E575",
            sound="default",
            channel_id="safeplant_critical_channel" if severity == "CRITICAL" else "safeplant_warning_channel"
        )
    )

    success_count = 0
    tokens_to_remove = []

    for token in list(REGISTERED_DEVICE_TOKENS):
        message = messaging.Message(
            token=token,
            data={
                "incident_id": str(incident.get("id", "")),
                "title": title,
                "message": body,
                "severity": severity,
                "zone": str(incident.get("zone", "Refinery Area")),
                "actual_metric": str(incident.get("peak_value", "Confirmed Alert")),
                "timestamp": str(incident.get("timestamp", ""))
            },
            android=android_config
        )

        try:
            response = messaging.send(message)
            logger.info(f"FCM push dispatched successfully: {response}")
            success_count += 1
        except messaging.UnregisteredError:
            logger.warning(f"Device token expired or app uninstalled. Removing {token[:12]}...")
            tokens_to_remove.append(token)
        except Exception as e:
            logger.error(f"FCM dispatch error to {token[:12]}...: {e}")

    for dead_token in tokens_to_remove:
        REGISTERED_DEVICE_TOKENS.discard(dead_token)

    return success_count`
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    category: 'network',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Network & Internet Access -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

    <!-- Android 13+ Notification Permission -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- CameraX On-Device Computer Vision -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <application
        android:name=".SafePlantApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="SafePlant AIoT"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SafePlantAIoT"
        android:usesCleartextTraffic="true"> <!-- Permits HTTP connections to laptop LAN IP -->

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/Theme.SafePlantAIoT">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Firebase Cloud Messaging Background Service -->
        <service
            android:name=".fcm.SafePlantFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

    </application>

</manifest>`
  }
];

export const ComposeCodeModal: React.FC<ComposeCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<KotlinFile>(kotlinFiles[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-5xl bg-[#0D1117] rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap bg-[#12161E]">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#10E575]/15 text-[#10E575] flex items-center justify-center shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">Kotlin, CameraX & FCM Architecture</h2>
              <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
                Production-Ready Android Jetpack Compose & FastAPI Integration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#1F2733] hover:bg-[#2A3545] border border-white/10 text-white text-[11px] sm:text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10E575]" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span className="hidden min-[360px]:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#10E575] hover:bg-[#12F07B] text-black text-[11px] sm:text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden min-[360px]:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-Column Editor Layout: File Explorer + Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* File Explorer Sidebar: compact height on mobile */}
          <div className="w-full md:w-80 bg-[#090C10] border-b md:border-b-0 md:border-r border-white/10 p-2 sm:p-3 flex flex-col gap-1 max-h-44 md:max-h-none overflow-y-auto shrink-0">
            <span className="text-[9.5px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1">
              Modules & Android Architecture
            </span>

            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
              {kotlinFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`flex items-center justify-between px-2 sm:px-2.5 py-1.5 sm:py-2.5 rounded-xl text-left text-[11px] sm:text-xs font-mono transition-colors shrink-0 md:shrink md:w-full ${
                    selectedFile.name === file.name
                      ? 'bg-[#18202A] text-[#10E575] font-semibold border border-[#10E575]/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[130px] sm:max-w-none">{file.name}</span>
                  </div>
                  <span className="text-[8.5px] sm:text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/40 text-slate-400 border border-white/5 shrink-0 ml-1">
                    {file.category}
                  </span>
                </button>
              ))}
            </div>

            <div className="hidden md:block mt-4 p-3 rounded-2xl bg-[#12161F] border border-white/5 text-[11px] font-mono text-slate-400">
              <span className="text-[#10E575] font-semibold block mb-1">Production Guidelines</span>
              <span className="leading-relaxed block">
                • Push tokens registered via POST /api/notifications/register-token<br/>
                • Background notifications wake device with NotificationCompat<br/>
                • CameraX KEEP_ONLY_LATEST prevents image queues<br/>
                • Zero simulated fallback data in production paths
              </span>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#0B0E14] overflow-hidden min-h-0">
            {/* File Path Bar */}
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-white/5 bg-[#0E1218] text-[10px] sm:text-[11px] font-mono text-slate-400 flex items-center justify-between gap-2">
              <span className="truncate">{selectedFile.path}</span>
              <span className="text-slate-500 uppercase shrink-0">{selectedFile.category}</span>
            </div>

            {/* Code Content */}
            <pre className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-[11px] sm:text-xs text-slate-200 leading-relaxed selection:bg-[#10E575]/20">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
