package com.safeplant.aiot

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.safeplant.aiot.data.model.*
import com.safeplant.aiot.ui.navigation.AppDestination
import com.safeplant.aiot.ui.navigation.SafePlantBottomNavigation
import com.safeplant.aiot.ui.screens.DashboardScreen
import com.safeplant.aiot.ui.theme.SafePlantTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            SafePlantTheme {
                var currentDestination by remember { mutableStateOf(AppDestination.DASHBOARD) }

                // In production, these StateFlows are collected from SafePlantViewModel
                val sensors by remember {
                    mutableStateOf(
                        listOf(
                            SensorReading(
                                id = "temp",
                                name = "Ambient Temperature",
                                category = "temperature",
                                value = null,
                                unit = "°C",
                                status = SensorStatus.UNAVAILABLE,
                                gpioPin = "GPIO 4",
                                hardwareModel = "DHT11",
                                warningThreshold = 35f,
                                criticalThreshold = 45f,
                                calibrationNote = "Calibrated digital temp stream"
                            ),
                            SensorReading(
                                id = "humidity",
                                name = "Relative Humidity",
                                category = "humidity",
                                value = null,
                                unit = "%RH",
                                status = SensorStatus.UNAVAILABLE,
                                gpioPin = "GPIO 4",
                                hardwareModel = "DHT11",
                                warningThreshold = 75f,
                                calibrationNote = "Calibrated digital RH stream"
                            ),
                            SensorReading(
                                id = "gas",
                                name = "Gas / Smoke Level",
                                category = "gas",
                                value = null,
                                unit = "ADC",
                                status = SensorStatus.UNAVAILABLE,
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
                                value = null,
                                unit = "IR",
                                status = SensorStatus.UNAVAILABLE,
                                gpioPin = "GPIO 15",
                                hardwareModel = "KY-026",
                                calibrationNote = "Digital active-low IR detector"
                            )
                        )
                    )
                }

                val systemState by remember { mutableStateOf(SystemSafetyState.DISCONNECTED) }
                val deviceMetadata by remember {
                    mutableStateOf(
                        DeviceMetadata(
                            deviceId = "ESP32_SAFEPLANT_GATEWAY_01",
                            connectionStatus = "DISCONNECTED",
                            lastPacketTimestamp = null,
                            wifiRssi = null,
                            isStale = false
                        )
                    )
                }
                val actuatorStatus by remember {
                    mutableStateOf(
                        HardwareActuatorStatus(
                            buzzerState = null,
                            relayState = null
                        )
                    )
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        SafePlantBottomNavigation(
                            currentDestination = currentDestination,
                            incidentCount = 0,
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
                                activeIncidentsCount = 0,
                                contentPadding = innerPadding
                            )
                        }
                        AppDestination.READINGS -> {
                            // ReadingsScreen composable
                        }
                        AppDestination.CAMERA -> {
                            // CameraVisionScreen composable
                        }
                        AppDestination.INCIDENTS -> {
                            // IncidentsScreen composable
                        }
                    }
                }
            }
        }
    }
}
