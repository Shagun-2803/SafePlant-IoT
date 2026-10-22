package com.safeplant.aiot.fcm

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.safeplant.aiot.notification.SafePlantNotificationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SafePlantFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Store or register new FCM token with SafePlant backend
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Sent to /api/notifications/fcm-token
            } catch (_: Exception) {
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "Hazard Warning"
        val body = remoteMessage.notification?.body ?: remoteMessage.data["message"] ?: "Telemetry threshold exceeded"
        val severity = remoteMessage.data["severity"] ?: "CRITICAL"

        SafePlantNotificationManager.showIncidentAlert(
            context = applicationContext,
            incidentId = System.currentTimeMillis().toInt(),
            title = title,
            message = body,
            severity = severity
        )
    }
}
