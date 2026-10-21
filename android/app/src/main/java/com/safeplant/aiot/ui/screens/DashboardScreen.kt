package com.safeplant.aiot.ui.screens

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
 *    3. Responsive Telemetry Sensor Grid
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
                    // Chunk into pairs of 2 for clean, equal-width 2-column rows
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
                                // If row has only 1 card (odd count), fill space cleanly
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
}
