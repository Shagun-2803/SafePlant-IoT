package com.safeplant.aiot

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.safeplant.aiot.data.model.*
import com.safeplant.aiot.ui.navigation.AppDestination
import com.safeplant.aiot.ui.navigation.SafePlantBottomNavigation
import com.safeplant.aiot.ui.screens.*
import com.safeplant.aiot.ui.theme.SafePlantTheme
import java.time.Instant

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            SafePlantTheme {
                var currentDestination by remember { mutableStateOf(AppDestination.DASHBOARD) }
                var baseUrl by remember { mutableStateOf("http://10.0.2.2:8000") }

                // State representations for sensor nodes
                val sensors by remember {
                    mutableStateOf(
                        listOf(
                            SensorReading(
                                id = "temp",
                                name = "Ambient Temperature",
                                category = "temperature",
                                value = 28.4f,
                                unit = "°C",
                                status = SensorStatus.NORMAL,
                                gpioPin = "GPIO 4",
                                hardwareModel = "DHT11",
                                warningThreshold = 45f,
                                criticalThreshold = 60f,
                                calibrationNote = "Calibrated digital temp stream"
                            ),
                            SensorReading(
                                id = "humidity",
                                name = "Relative Humidity",
                                category = "humidity",
                                value = 54.2f,
                                unit = "%RH",
                                status = SensorStatus.NORMAL,
                                gpioPin = "GPIO 4",
                                hardwareModel = "DHT11",
                                warningThreshold = 75f,
                                calibrationNote = "Calibrated digital RH stream"
                            ),
                            SensorReading(
                                id = "gas",
                                name = "Gas / Smoke Level",
                                category = "gas",
                                value = 412f,
                                unit = "ADC",
                                status = SensorStatus.NORMAL,
                                gpioPin = "Pin 36",
                                hardwareModel = "MQ-2",
                                warningThreshold = 1800f,
                                criticalThreshold = 2800f,
                                calibrationNote = "Uncalibrated 12-bit analog reading"
                            ),
                            SensorReading(
                                id = "flame",
                                name = "Optical Flame Presence",
                                category = "flame",
                                value = 0.0f,
                                unit = "IR",
                                status = SensorStatus.NORMAL,
                                gpioPin = "GPIO 15",
                                hardwareModel = "KY-026",
                                calibrationNote = "Digital active-low IR detector"
                            )
                        )
                    )
                }

                val systemState by remember { mutableStateOf(SystemSafetyState.NORMAL) }
                val deviceMetadata by remember {
                    mutableStateOf(
                        DeviceMetadata(
                            deviceId = "ESP32_SAFEPLANT_GATEWAY_01",
                            connectionStatus = "CONNECTED",
                            lastPacketTimestamp = Instant.now(),
                            wifiRssi = -62,
                            isStale = false
                        )
                    )
                }
                val actuatorStatus by remember {
                    mutableStateOf(
                        HardwareActuatorStatus(
                            buzzerState = false,
                            relayState = false
                        )
                    )
                }

                // Sample audit incidents
                var incidents by remember {
                    mutableStateOf(
                        listOf(
                            IncidentRecord(
                                id = 101,
                                timestamp = "2026-10-22T08:14:32Z",
                                type = "TEMPERATURE_WARNING",
                                severity = "WARNING",
                                status = "OPEN",
                                sensorName = "DHT11 Temperature",
                                readingValue = "47.2 °C",
                                message = "Ambient temperature exceeded warning threshold of 45°C."
                            ),
                            IncidentRecord(
                                id = 102,
                                timestamp = "2026-10-22T06:40:10Z",
                                type = "MQ2_SMOKE_ELEVATED",
                                severity = "WARNING",
                                status = "RESOLVED",
                                sensorName = "MQ-2 Gas / Smoke",
                                readingValue = "1920 ADC",
                                message = "Transient smoke spike detected during test run.",
                                resolutionNotes = "Verified exhaust fan turned on automatically. ADC returned to 410."
                            )
                        )
                    )
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        SafePlantBottomNavigation(
                            currentDestination = currentDestination,
                            incidentCount = incidents.count { it.status == "OPEN" },
                            onDestinationSelected = { currentDestination = it }
                        )
                    }
                ) { innerPadding ->
                    when (currentDestination) {
                        AppDestination.DASHBOARD -> {
                            DashboardScreen(
                                sensors = sensors,
                                systemState = systemState,
                                deviceMetadata = deviceMetadata,
                                actuatorStatus = actuatorStatus,
                                activeIncidentsCount = incidents.count { it.status == "OPEN" },
                                contentPadding = innerPadding
                            )
                        }
                        AppDestination.READINGS -> {
                            ReadingsScreen(
                                modifier = Modifier.padding(innerPadding)
                            )
                        }
                        AppDestination.CAMERA -> {
                            CameraVisionScreen(
                                onIntrusionDetected = { conf, zone ->
                                    val newInc = IncidentRecord(
                                        id = (100..999).random(),
                                        timestamp = Instant.now().toString(),
                                        type = "INTRUSION_DETECTED",
                                        severity = "CRITICAL",
                                        status = "OPEN",
                                        sensorName = "Camera Edge Vision",
                                        readingValue = "${(conf * 100).toInt()}% conf",
                                        message = "Person detected inside $zone"
                                    )
                                    incidents = listOf(newInc) + incidents
                                },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }
                        AppDestination.INCIDENTS -> {
                            IncidentsScreen(
                                incidents = incidents,
                                onAcknowledge = { incId ->
                                    incidents = incidents.map {
                                        if (it.id == incId) it.copy(status = "ACKNOWLEDGED") else it
                                    }
                                },
                                onResolve = { incId, note ->
                                    incidents = incidents.map {
                                        if (it.id == incId) it.copy(status = "RESOLVED", resolutionNotes = note) else it
                                    }
                                },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }
                        AppDestination.SETTINGS -> {
                            SettingsScreen(
                                currentBaseUrl = baseUrl,
                                onSaveBaseUrl = { baseUrl = it },
                                onTestConnection = { url ->
                                    true
                                },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }
                    }
                }
            }
        }
    }
}
