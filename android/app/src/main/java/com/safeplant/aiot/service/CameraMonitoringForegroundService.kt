package com.safeplant.aiot.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.safeplant.aiot.MainActivity
import com.safeplant.aiot.R

private const val CHANNEL_MONITORING = "safeplant_camera_foreground"
private const val NOTIFICATION_ID = 2001

/**
 * Android Foreground Service for user-started camera monitoring (Section 6).
 * Complies with Android 14+ foregroundServiceType="camera".
 */
class CameraMonitoringForegroundService : Service() {

    override fun onCreate() {
        super.onCreate()
        createMonitoringNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == ACTION_STOP_MONITORING) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = buildPersistentMonitoringNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        return START_STICKY
    }

    private fun buildPersistentMonitoringNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            putExtra("EXTRA_TAB", "camera")
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, CameraMonitoringForegroundService::class.java).apply {
            action = ACTION_STOP_MONITORING
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_MONITORING)
            .setContentTitle("SafePlant AIoT Camera Monitoring")
            .setContentText("Restricted zone perimeter vision active")
            .setSmallIcon(R.drawable.ic_camera)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_stop, "Stop Monitoring", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createMonitoringNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_MONITORING,
                "Camera Monitoring Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Displays persistent indicator while CameraX restricted zone monitoring is active"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_STOP_MONITORING = "com.safeplant.aiot.action.STOP_MONITORING"
    }
}
