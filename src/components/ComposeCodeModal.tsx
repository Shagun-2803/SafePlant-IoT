import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Layers, 
  Shield, 
  Bell, 
  Camera, 
  Server, 
  Terminal, 
  Activity, 
  Sliders 
} from 'lucide-react';

interface ComposeCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CodeFileItem {
  name: string;
  path: string;
  category: 'compose_ui' | 'network' | 'fcm' | 'vision' | 'backend' | 'build';
  content: string;
}

const sourceCodeFiles: CodeFileItem[] = [
  {
    name: 'DashboardScreen.kt',
    path: 'com/safeplant/aiot/ui/screens/DashboardScreen.kt',
    category: 'compose_ui',
    content: `package com.safeplant.aiot.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.data.model.*
import com.safeplant.aiot.ui.components.DeviceStatusCard
import com.safeplant.aiot.ui.components.SensorCard
import com.safeplant.aiot.ui.theme.*

/**
 * SafePlant DashboardScreen (Jetpack Compose Material 3).
 *
 * Refactored Architecture:
 * - Single root scrollable container (LazyColumn) respecting Scaffold innerPadding.
 * - Consistent 16.dp horizontal content margins and 14.dp inter-section spacing.
 * - Responsive 2-column or 1-column layout via BoxWithConstraints width calculation.
 * - Prominent visual hierarchy:
 *    1. Plant Safety State Hero Banner
 *    2. ESP32 Gateway & Actuator Status Card
 *    3. Responsive Telemetry Sensor Grid (No clipping, separate status badges)
 *    4. Active Incident Summary Strip
 */
@Composable
fun DashboardScreen(
    sensors: List<SensorReading>,
    systemState: SystemSafetyState,
    deviceMetadata: DeviceMetadata,
    actuatorStatus: HardwareActuatorStatus,
    activeIncidentsCount: Int,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    onOpenSettings: () -> Unit = {},
    onNavigateToReadings: () -> Unit = {},
    onNavigateToIncidents: () -> Unit = {}
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(IndustrialBackground),
        contentPadding = PaddingValues(
            top = contentPadding.calculateTopPadding() + 16.dp,
            bottom = contentPadding.calculateBottomPadding() + 24.dp,
            start = 16.dp,
            end = 16.dp
        ),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Overall Plant Safety Status Banner (Hero)
        item {
            val statusColor = when (systemState) {
                SystemSafetyState.NOMINAL -> EmeraldGreen
                SystemSafetyState.WARNING -> WarningAmber
                SystemSafetyState.CRITICAL -> HazardRed
                SystemSafetyState.STALE_DATA -> StaleOrange
                SystemSafetyState.DISCONNECTED -> HazardRed
            }

            val statusBg = when (systemState) {
                SystemSafetyState.NOMINAL -> EmeraldGreenSubtle
                SystemSafetyState.WARNING -> WarningAmberSubtle
                SystemSafetyState.CRITICAL -> HazardRedSubtle
                SystemSafetyState.STALE_DATA -> StaleOrangeSubtle
                SystemSafetyState.DISCONNECTED -> HazardRedSubtle
            }

            val (headline, subtitle) = when (systemState) {
                SystemSafetyState.NOMINAL -> Pair("ALL SYSTEMS NOMINAL", "Environmental conditions within calibrated thresholds")
                SystemSafetyState.WARNING -> Pair("SAFETY WARNING ACTIVE", "Sensors registering boundary threshold alerts")
                SystemSafetyState.CRITICAL -> Pair("CRITICAL HAZARD DETECTED", "Immediate danger: toxic gas spike or active flame")
                SystemSafetyState.STALE_DATA -> Pair("STALE TELEMETRY DATA", "No recent packets received within threshold period")
                SystemSafetyState.DISCONNECTED -> Pair("ESP32 DISCONNECTED", "Gateway telemetry stream is currently unreachable")
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = IndustrialSurface,
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(statusColor.copy(alpha = 0.4f))
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = statusBg,
                            modifier = Modifier.size(44.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = if (systemState == SystemSafetyState.NOMINAL) Icons.Default.Shield
                                    else if (systemState == SystemSafetyState.CRITICAL) Icons.Default.Warning
                                    else Icons.Default.Info,
                                    contentDescription = null,
                                    tint = statusColor,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(statusColor)
                                )
                                Text(
                                    text = headline,
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    ),
                                    color = statusColor
                                )
                            }
                            Text(
                                text = subtitle,
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                                color = TextSecondary,
                                maxLines = 2
                            )
                        }
                    }

                    IconButton(
                        onClick = onOpenSettings,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Configuration",
                            tint = TextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // 2. ESP32 Gateway & Actuator Hardware Section
        item {
            DeviceStatusCard(
                device = deviceMetadata,
                actuators = actuatorStatus
            )
        }

        // 3. Telemetry Section Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "REAL HARDWARE TELEMETRY",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        fontSize = 11.sp
                    ),
                    color = TextSecondary
                )

                TextButton(
                    onClick = onNavigateToReadings,
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "Historical Charts →",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp
                        ),
                        color = EmeraldGreen
                    )
                }
            }
        }

        // 4. Responsive Sensor Cards Grid
        item {
            BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                val availableWidth = maxWidth
                // Responsive calculation: single column if screen width < 360dp, otherwise equal 2-column grid
                val isNarrow = availableWidth < 360.dp

                if (isNarrow || sensors.isEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        sensors.forEach { sensor ->
                            SensorCard(sensor = sensor)
                        }
                    }
                } else {
                    val rows = sensors.chunked(2)
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        rows.forEach { rowSensors ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                rowSensors.forEach { sensor ->
                                    Box(modifier = Modifier.weight(1f)) {
                                        SensorCard(sensor = sensor)
                                    }
                                }
                                if (rowSensors.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Active Incident Summary Strip
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = IndustrialSurface),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(IndustrialSurfaceBorder)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (activeIncidentsCount > 0) WarningAmberSubtle else Color(0x14FFFFFF),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = if (activeIncidentsCount > 0) Icons.Default.Warning else Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = if (activeIncidentsCount > 0) WarningAmber else EmeraldGreen,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                            Text(
                                text = "Active Abnormalities",
                                style = MaterialTheme.typography.titleSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                ),
                                color = TextPrimary
                            )
                            Text(
                                text = if (activeIncidentsCount == 0) "Zero active hazards · Verified safe"
                                else "$activeIncidentsCount open event(s) pending audit",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 10.5.sp
                                ),
                                color = TextSecondary
                            )
                        }
                    }

                    Button(
                        onClick = onNavigateToIncidents,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0x1FFFFFFF),
                            contentColor = TextPrimary
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "Audit Log",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        }
    }
}`
  },
  {
    name: 'SensorCard.kt',
    path: 'com/safeplant/aiot/ui/components/SensorCard.kt',
    category: 'compose_ui',
    content: `package com.safeplant.aiot.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.data.model.SensorReading
import com.safeplant.aiot.data.model.SensorStatus
import com.safeplant.aiot.ui.theme.*

/**
 * Responsive, non-clipped industrial sensor card composable.
 * - Places status badge in dedicated vertical layout to prevent crowding or overlapping titles.
 * - Wraps titles naturally without hardcoded widths or fixed heights.
 * - Keeps sensor value and measurement unit tightly visually associated.
 * - Handles null/unavailable telemetry cleanly without layout shifts or mock data.
 */
@Composable
fun SensorCard(
    sensor: SensorReading,
    modifier: Modifier = Modifier
) {
    val statusColor = when (sensor.status) {
        SensorStatus.CRITICAL -> HazardRed
        SensorStatus.WARNING -> WarningAmber
        SensorStatus.NORMAL -> EmeraldGreen
        SensorStatus.UNAVAILABLE -> TextMuted
    }

    val statusBg = when (sensor.status) {
        SensorStatus.CRITICAL -> HazardRedSubtle
        SensorStatus.WARNING -> WarningAmberSubtle
        SensorStatus.NORMAL -> EmeraldGreenSubtle
        SensorStatus.UNAVAILABLE -> Color(0x1A64748B)
    }

    val statusLabel = when (sensor.status) {
        SensorStatus.CRITICAL -> "CRITICAL"
        SensorStatus.WARNING -> "WARNING"
        SensorStatus.NORMAL -> "NOMINAL"
        SensorStatus.UNAVAILABLE -> "UNAVAILABLE"
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = 160.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = IndustrialCardBg),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(
                if (sensor.status == SensorStatus.CRITICAL) HazardRed.copy(alpha = 0.5f)
                else IndustrialSurfaceBorder
            )
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Row 1: Hardware Model & GPIO kicker + Unobtrusive Status Indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "\${sensor.hardwareModel} · \${sensor.gpioPin}",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 10.sp
                    ),
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )

                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(statusBg)
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(statusColor)
                    )
                    Text(
                        text = statusLabel,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 9.sp
                        ),
                        color = statusColor
                    )
                }
            }

            // Row 2: Sensor Title - Full width, allowing natural multi-line wrapping
            Text(
                text = sensor.name,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    lineHeight = 18.sp
                ),
                color = TextPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Row 3: Metric Value and Unit (tightly visually bound together)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = if (sensor.value != null) {
                            if (sensor.category == "gas") "\${sensor.value.toInt()}"
                            else if (sensor.category == "flame") {
                                if (sensor.value == 1f) "FLAME" else "CLEAR"
                            } else "%.1f".format(sensor.value)
                        } else "—",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black,
                            fontSize = if (sensor.category == "flame") 20.sp else 26.sp
                        ),
                        color = if (sensor.status == SensorStatus.CRITICAL) HazardRed
                        else if (sensor.value != null) TextPrimary
                        else TextMuted
                    )

                    Text(
                        text = sensor.unit,
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp
                        ),
                        color = TextSecondary,
                        modifier = Modifier.padding(bottom = 3.dp)
                    )
                }

                // Thresholds / limits metadata
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(1.dp)
                ) {
                    if (sensor.warningThreshold != null) {
                        Text(
                            text = "Warn: \${sensor.warningThreshold.toInt()}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 9.5.sp
                            ),
                            color = WarningAmber
                        )
                    }
                    if (sensor.criticalThreshold != null) {
                        Text(
                            text = "Crit: \${sensor.criticalThreshold.toInt()}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 9.5.sp
                            ),
                            color = HazardRed
                        )
                    }
                }
            }

            // Row 4: Sub-info footer
            sensor.calibrationNote?.let { note ->
                Divider(
                    color = Color(0x14FFFFFF),
                    thickness = 1.dp,
                    modifier = Modifier.padding(top = 2.dp)
                )
                Text(
                    text = note,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 9.5.sp
                    ),
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}`
  },
  {
    name: 'DeviceStatusCard.kt',
    path: 'com/safeplant/aiot/ui/components/DeviceStatusCard.kt',
    category: 'compose_ui',
    content: `package com.safeplant.aiot.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.data.model.DeviceMetadata
import com.safeplant.aiot.data.model.HardwareActuatorStatus
import com.safeplant.aiot.ui.theme.*

/**
 * Responsive Device & Hardware Actuator Card.
 * - Clear visual hierarchy distinguishing gateway metadata from active actuator state.
 * - Truncates long device IDs safely.
 * - Handles unknown buzzer/relay states gracefully without assuming ON/OFF.
 * - Displays physical feedback limitation disclaimer as compact info note.
 */
@Composable
fun DeviceStatusCard(
    device: DeviceMetadata,
    actuators: HardwareActuatorStatus,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = IndustrialSurface),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(IndustrialSurfaceBorder)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ESP32 GATEWAY STATUS",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        fontSize = 11.sp
                    ),
                    color = TextSecondary
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val isConnected = device.connectionStatus == "CONNECTED"
                    val indicatorColor = if (isConnected) EmeraldGreen else if (device.isStale) StaleOrange else HazardRed

                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(indicatorColor)
                    )
                    Text(
                        text = if (isConnected) "CONNECTED" else if (device.isStale) "STALE DATA" else "DISCONNECTED",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        ),
                        color = indicatorColor
                    )
                }
            }

            // 4-item Responsive Metadata Grid
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetadataItem(
                    label = "DEVICE ID",
                    value = device.deviceId,
                    modifier = Modifier.weight(1f),
                    truncate = true
                )
                MetadataItem(
                    label = "TELEMETRY",
                    value = if (device.connectionStatus == "CONNECTED") "Fresh (<8s)"
                    else if (device.isStale) "Stale"
                    else "Unavailable",
                    modifier = Modifier.weight(1f),
                    highlightColor = if (device.connectionStatus == "CONNECTED") EmeraldGreen
                    else if (device.isStale) StaleOrange
                    else TextMuted
                )
                MetadataItem(
                    label = "LAST PACKET",
                    value = device.lastPacketTimestamp ?: "None",
                    modifier = Modifier.weight(1f),
                    truncate = true
                )
                MetadataItem(
                    label = "WIFI RSSI",
                    value = device.wifiRssi?.let { "$it dBm" } ?: "—",
                    modifier = Modifier.weight(1f)
                )
            }

            Divider(color = Color(0x14FFFFFF), thickness = 1.dp)

            // Actuator Section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ActuatorItem(
                        name = "BUZZER",
                        gpio = "GPIO \${actuators.buzzerGpio}",
                        state = actuators.buzzerState ?: "UNKNOWN"
                    )
                    ActuatorItem(
                        name = "EXHAUST RELAY",
                        gpio = "GPIO \${actuators.relayGpio}",
                        state = actuators.relayState ?: "UNKNOWN"
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0x14FFFFFF),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Commanded states only · Physical feedback sensor unequipped on hardware",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 9.5.sp
                    ),
                    color = TextSecondary,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                )
            }
        }
    }
}`
  },
  {
    name: 'SafePlantBottomNavigation.kt',
    path: 'com/safeplant/aiot/ui/navigation/SafePlantBottomNavigation.kt',
    category: 'compose_ui',
    content: `package com.safeplant.aiot.ui.navigation

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.ui.theme.EmeraldGreen
import com.safeplant.aiot.ui.theme.IndustrialSurface
import com.safeplant.aiot.ui.theme.TextMuted
import com.safeplant.aiot.ui.theme.TextPrimary

enum class AppDestination(val title: String, val icon: ImageVector) {
    DASHBOARD("Dashboard", Icons.Default.Shield),
    READINGS("Readings", Icons.Default.Timeline),
    CAMERA("Camera", Icons.Default.Videocam),
    INCIDENTS("Incidents", Icons.Default.Warning)
}

@Composable
fun SafePlantBottomNavigation(
    currentDestination: AppDestination,
    incidentCount: Int,
    onDestinationSelected: (AppDestination) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars),
        containerColor = IndustrialSurface,
        contentColor = TextPrimary,
        tonalElevation = 2.dp
    ) {
        AppDestination.values().forEach { destination ->
            val isSelected = currentDestination == destination

            NavigationBarItem(
                selected = isSelected,
                onClick = { onDestinationSelected(destination) },
                icon = {
                    BadgedBox(
                        badge = {
                            if (destination == AppDestination.INCIDENTS && incidentCount > 0) {
                                Badge(
                                    containerColor = Color(0xFFF59E0B),
                                    contentColor = Color.Black
                                ) {
                                    Text(text = incidentCount.toString())
                                }
                            }
                        }
                    ) {
                        Icon(
                            imageVector = destination.icon,
                            contentDescription = destination.title,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                },
                label = {
                    Text(
                        text = destination.title,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = EmeraldGreen,
                    selectedTextColor = TextPrimary,
                    indicatorColor = Color(0x2610E575),
                    unselectedIconColor = TextMuted,
                    unselectedTextColor = TextMuted
                )
            )
        }
    }
}`
  },
  {
    name: 'CameraXVisionAnalyzer.kt',
    path: 'com/safeplant/aiot/vision/CameraXVisionAnalyzer.kt',
    category: 'vision',
    content: `package com.safeplant.aiot.vision

import android.graphics.Rect
import android.graphics.RectF
import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.objects.DetectedObject
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.ObjectDetector
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

data class PlantVisionDetection(
    val id: String,
    val label: String,
    val confidence: Float,
    val normalizedBoundingBox: RectF,
    val isInHazardZone: Boolean,
    val timestamp: Long
)

class CameraXVisionAnalyzer(
    private val onDetectionsUpdated: (List<PlantVisionDetection>) -> Unit,
    private val onPerimeterBreachTriggered: (PlantVisionDetection) -> Unit
) : ImageAnalysis.Analyzer {

    private val isBusy = AtomicBoolean(false)
    private val scope = CoroutineScope(Dispatchers.Default)

    private val detector: ObjectDetector by lazy {
        val options = ObjectDetectorOptions.Builder()
            .setDetectorMode(ObjectDetectorOptions.STREAM_MODE)
            .enableMultipleObjects()
            .enableClassification()
            .build()
        ObjectDetection.getClient(options)
    }

    private val hazardZonePolygon = RectF(0.20f, 0.25f, 0.80f, 0.85f)

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        if (!isBusy.compareAndSet(false, true)) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            isBusy.set(false)
            return
        }

        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val inputImage = InputImage.fromMediaImage(mediaImage, rotationDegrees)
        val imageWidth = if (rotationDegrees == 90 || rotationDegrees == 270) imageProxy.height else imageProxy.width
        val imageHeight = if (rotationDegrees == 90 || rotationDegrees == 270) imageProxy.width else imageProxy.height

        detector.process(inputImage)
            .addOnSuccessListener { detectedObjects ->
                scope.launch {
                    val detections = detectedObjects.mapNotNull { obj ->
                        mapToPlantDetection(obj, imageWidth, imageHeight)
                    }
                    onDetectionsUpdated(detections)

                    detections.firstOrNull { it.isInHazardZone && it.confidence > 0.60f }?.let { breach ->
                        onPerimeterBreachTriggered(breach)
                    }
                }
            }
            .addOnCompleteListener {
                imageProxy.close()
                isBusy.set(false)
            }
    }

    private fun mapToPlantDetection(obj: DetectedObject, frameWidth: Int, frameHeight: Int): PlantVisionDetection? {
        val box = obj.boundingBox
        val normBox = RectF(
            box.left.toFloat() / frameWidth,
            box.top.toFloat() / frameHeight,
            box.right.toFloat() / frameWidth,
            box.bottom.toFloat() / frameHeight
        )
        val primaryLabel = obj.labels.firstOrNull()?.text ?: "Person / Object"
        val confidence = obj.labels.firstOrNull()?.confidence ?: 0.75f
        val intersectsHazard = RectF.intersects(hazardZonePolygon, normBox)

        return PlantVisionDetection(
            id = obj.trackingId?.toString() ?: java.util.UUID.randomUUID().toString(),
            label = primaryLabel,
            confidence = confidence,
            normalizedBoundingBox = normBox,
            isInHazardZone = intersectsHazard,
            timestamp = System.currentTimeMillis()
        )
    }
}`
  },
  {
    name: 'SafePlantFirebaseMessagingService.kt',
    path: 'com/safeplant/aiot/fcm/SafePlantFirebaseMessagingService.kt',
    category: 'fcm',
    content: `package com.safeplant.aiot.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SafePlantFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Production sync with FastAPI backend
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        val title = remoteMessage.notification?.title ?: "SafePlant Alert"
        val body = remoteMessage.notification?.body ?: "Plant condition update"
        showNotification(title, body)
    }

    private fun showNotification(title: String, body: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createChannels(manager)

        val notification = NotificationCompat.Builder(this, CHANNEL_CRITICAL_ALERTS)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createChannels(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val critChannel = NotificationChannel(
                CHANNEL_CRITICAL_ALERTS,
                "Critical Plant Hazards",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Gas spikes, active flames, and perimeter breaches"
                enableVibration(true)
            }
            manager.createNotificationChannel(critChannel)
        }
    }

    companion object {
        const val CHANNEL_CRITICAL_ALERTS = "safeplant_critical_channel"
    }
}`
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    category: 'build',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA" />

    <application
        android:name=".SafePlantApplication"
        android:icon="@mipmap/ic_launcher"
        android:label="SafePlant AIoT"
        android:theme="@style/Theme.SafePlantAIoT"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".fcm.SafePlantFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <service
            android:name=".service.CameraMonitoringForegroundService"
            android:foregroundServiceType="camera"
            android:exported="false" />
    </application>
</manifest>`
  }
];

export const ComposeCodeModal: React.FC<ComposeCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<CodeFileItem>(sourceCodeFiles[0]);
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
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">Native Android Kotlin & FastAPI Source Code</h2>
              <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
                Jetpack Compose · Material 3 · CameraX · Responsive Grid · No Clipping
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#1F2733] hover:bg-[#2A3545] border border-white/10 text-white text-[11px] sm:text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10E575]" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#10E575] hover:bg-[#12F07B] text-black text-[11px] sm:text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-Column Editor Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-80 bg-[#090C10] border-b md:border-b-0 md:border-r border-white/10 p-2 sm:p-3 flex flex-col gap-1 max-h-44 md:max-h-none overflow-y-auto shrink-0">
            <span className="text-[9.5px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1">
              Architecture Files
            </span>
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
              {sourceCodeFiles.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-[11px] sm:text-xs font-mono transition-colors shrink-0 md:shrink md:w-full ${
                    selectedFile.name === file.name
                      ? 'bg-[#18202A] text-[#10E575] font-semibold border border-[#10E575]/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[8.5px] uppercase px-1.5 py-0.2 rounded bg-black/40 text-slate-400 border border-white/5 shrink-0 ml-1">
                    {file.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#0B0E14] overflow-hidden min-h-0">
            <div className="px-3 sm:px-4 py-2 border-b border-white/5 bg-[#0E1218] text-[10px] sm:text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span className="truncate">{selectedFile.path}</span>
              <span className="text-slate-500 uppercase shrink-0">{selectedFile.category}</span>
            </div>
            <pre className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-[11px] sm:text-xs text-slate-200 leading-relaxed selection:bg-[#10E575]/20">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
