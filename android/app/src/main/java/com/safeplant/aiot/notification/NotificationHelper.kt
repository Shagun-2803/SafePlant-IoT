package com.safeplant.aiot.notification

import android.content.Context

/**
 * NotificationHelper singleton providing ergonomic notification dispatch
 * for SafePlant AIoT optical intrusion alerts and environmental hazards.
 */
object NotificationHelper {

    fun showIntrusionAlert(
        context: Context,
        confidence: Float,
        zone: String,
        notificationId: Int = 1001
    ) {
        val manager = SafePlantNotificationManager.getInstance(context)
        val confPct = (confidence * 100).toInt()
        manager.dispatchCriticalHazardNotification(
            title = "CRITICAL: Restricted Zone Intrusion",
            description = "Unauthorized person detected inside $zone (Confidence: $confPct%).",
            notificationId = notificationId
        )
    }

    fun dispatchCritical(
        context: Context,
        title: String,
        description: String,
        notificationId: Int = (System.currentTimeMillis() % 10000).toInt()
    ) {
        SafePlantNotificationManager.getInstance(context).dispatchCriticalHazardNotification(
            title = title,
            description = description,
            notificationId = notificationId
        )
    }

    fun dispatchWarning(
        context: Context,
        title: String,
        description: String,
        notificationId: Int = (System.currentTimeMillis() % 10000).toInt()
    ) {
        SafePlantNotificationManager.getInstance(context).dispatchWarningNotification(
            title = title,
            description = description,
            notificationId = notificationId
        )
    }
}
