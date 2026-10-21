package com.safeplant.aiot.data.model

enum class SystemSafetyState {
    NOMINAL,
    WARNING,
    CRITICAL,
    STALE_DATA,
    DISCONNECTED
}

enum class SensorStatus {
    NORMAL,
    WARNING,
    CRITICAL,
    UNAVAILABLE
}

data class SensorReading(
    val id: String,
    val name: String,
    val category: String, // "temperature", "humidity", "gas", "flame"
    val value: Float?,
    val unit: String,
    val status: SensorStatus,
    val gpioPin: String,
    val hardwareModel: String,
    val warningThreshold: Float? = null,
    val criticalThreshold: Float? = null,
    val calibrationNote: String? = null
)

data class IncidentRecord(
    val id: String,
    val title: String,
    val severity: String,
    val timestamp: String,
    val status: String,
    val description: String
)

data class HardwareActuatorStatus(
    val buzzerState: String?, // "ON", "OFF", or null if unknown
    val relayState: String?,  // "ON", "OFF", or null if unknown
    val buzzerGpio: Int = 18,
    val relayGpio: Int = 19
)

data class DeviceMetadata(
    val deviceId: String,
    val connectionStatus: String,
    val lastPacketTimestamp: String?,
    val wifiRssi: Int?,
    val isStale: Boolean
)
