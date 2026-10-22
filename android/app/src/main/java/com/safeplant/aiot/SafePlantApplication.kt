package com.safeplant.aiot

import android.app.Application
import com.safeplant.aiot.notification.SafePlantNotificationManager

class SafePlantApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize notification channels on application startup
        SafePlantNotificationManager.initChannels(this)
    }
}
