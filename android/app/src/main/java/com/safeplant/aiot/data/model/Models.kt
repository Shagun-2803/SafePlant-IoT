package com.safeplant.aiot.data.model

import android.graphics.RectF

enum class SystemSafetyState {
    NOMINAL,
    NORMAL,
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
    val description: String,
    val type: String = "SAFETY_INCIDENT",
    val sensorName: String? = null,
    val readingValue: String? = null,
    val triggeringValue: String? = null,
    val thresholdValue: String? = null,
    val message: String = description,
    val acknowledged: Boolean = false,
    val acknowledgedBy: String? = null,
    val acknowledgedAt: String? = null,
    val resolved: Boolean = false,
    val resolutionNotes: String? = null
) {
    // Secondary constructor for integer IDs
    constructor(
        id: Int,
        timestamp: String,
        type: String,
        severity: String,
        status: String,
        sensorName: String?,
        readingValue: String?,
        message: String,
        resolutionNotes: String? = null
    ) : this(
        id = id.toString(),
        title = message,
        severity = severity.lowercase(),
        timestamp = timestamp,
        status = status.lowercase(),
        description = message,
        type = type,
        sensorName = sensorName,
        readingValue = readingValue,
        triggeringValue = readingValue,
        message = message,
        resolved = status.equals("resolved", ignoreCase = true),
        resolutionNotes = resolutionNotes
    )
}

data class HardwareActuatorStatus(
    val buzzerState: Boolean = false,
    val relayState: Boolean = false,
    val buzzerGpio: Int = 18,
    val relayGpio: Int = 19
)

data class DeviceMetadata(
    val deviceId: String,
    val connectionStatus: String,
    val lastPacketTimestamp: Any?,
    val wifiRssi: Int?,
    val isStale: Boolean
)

data class PolygonVertex(
    val x: Float,
    val y: Float
)

data class RestrictedZonePolygon(
    val id: String = "zone_perimeter_01",
    val name: String = "High-Voltage Relay Zone",
    val zoneX: Float = 0.20f,
    val zoneY: Float = 0.25f,
    val zoneW: Float = 0.60f,
    val zoneH: Float = 0.50f,
    val enabled: Boolean = true,
    val cooldownSeconds: Long = 15L,
    val vertices: List<PolygonVertex> = listOf(
        PolygonVertex(20f, 25f),
        PolygonVertex(80f, 25f),
        PolygonVertex(80f, 75f),
        PolygonVertex(20f, 75f)
    )
)

data class VisionIncidentDto(
    val id: String,
    val timestamp: String,
    val title: String,
    val zone: String,
    val confidence: Double,
    val source: String = "android_camera",
    val peopleCount: Int = 1
)

data class DetectedPerson(
    val id: Int,
    val boundingBox: RectF, // Normalized 0f..1f (left, top, right, bottom)
    val confidence: Float,
    val isInRestrictedZone: Boolean = false
)

data class AiEventPayloadDto(
    val polygon_id: String,
    val people_count: Int,
    val confidence: Float,
    val timestamp: String? = null,
    val idempotency_key: String? = null,
    val source: String = "android_camera",
    val is_hardware: Boolean = false
)
