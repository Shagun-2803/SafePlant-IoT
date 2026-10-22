package com.safeplant.aiot.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat

/**
 * Local Notification Manager for SafePlant AIoT.
 * Creates separate notification channels for Critical Hazards and Environmental Warnings.
 * Enforces cooldowns to prevent alert notification spam.
 */
class SafePlantNotificationManager(private val context: Context) {

    private val notificationManager = 
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private var lastDispatchedAlertTime = 0L
    private val alertCooldownMs = 15000L // 15s cooldown

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val criticalChannel = NotificationChannel(
                CHANNEL_CRITICAL,
                "Critical Plant Hazards",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Gas spikes, active flames, and perimeter security breaches"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500)
            }

            val warningChannel = NotificationChannel(
                CHANNEL_WARNING,
                "Environmental Warnings",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Temperature and humidity approaching safety envelope thresholds"
            }

            notificationManager.createNotificationChannel(criticalChannel)
            notificationManager.createNotificationChannel(warningChannel)
        }
    }

    fun dispatchCriticalHazardNotification(
        title: String,
        description: String,
        notificationId: Int = (System.currentTimeMillis() % 10000).toInt()
    ) {
        val now = System.currentTimeMillis()
        if (now - lastDispatchedAlertTime < alertCooldownMs) {
            return // Prevent duplicate notification spam
        }
        lastDispatchedAlertTime = now

        val notification = NotificationCompat.Builder(context, CHANNEL_CRITICAL)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(description)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(notificationId, notification)
    }

    fun dispatchWarningNotification(
        title: String,
        description: String,
        notificationId: Int = (System.currentTimeMillis() % 10000).toInt()
    ) {
        val notification = NotificationCompat.Builder(context, CHANNEL_WARNING)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(description)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(notificationId, notification)
    }

    companion object {
        const val CHANNEL_CRITICAL = "safeplant_critical_channel"
        const val CHANNEL_WARNING = "safeplant_warning_channel"

        @Volatile
        private var instance: SafePlantNotificationManager? = null

        fun getInstance(context: Context): SafePlantNotificationManager {
            return instance ?: synchronized(this) {
                instance ?: SafePlantNotificationManager(context.applicationContext).also {
                    instance = it
                }
            }
        }

        fun initChannels(context: Context) {
            getInstance(context)
        }
    }
}
