package com.safeplant.aiot.ui.components

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
            // Header Row: Section Label & Connection Indicator
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
                // Device ID
                MetadataItem(
                    label = "DEVICE ID",
                    value = device.deviceId,
                    modifier = Modifier.weight(1f),
                    truncate = true
                )

                // Telemetry Freshness
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

                // Last Packet
                MetadataItem(
                    label = "LAST PACKET",
                    value = device.lastPacketTimestamp ?: "None",
                    modifier = Modifier.weight(1f),
                    truncate = true
                )

                // Wi-Fi RSSI
                MetadataItem(
                    label = "WIFI RSSI",
                    value = device.wifiRssi?.let { "$it dBm" } ?: "—",
                    modifier = Modifier.weight(1f)
                )
            }

            Divider(color = Color(0x14FFFFFF), thickness = 1.dp)

            // Actuator Section: Commanded State vs Verified
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Buzzer
                    ActuatorItem(
                        name = "BUZZER",
                        gpio = "GPIO ${actuators.buzzerGpio}",
                        state = actuators.buzzerState ?: "UNKNOWN"
                    )

                    // Exhaust Fan Relay
                    ActuatorItem(
                        name = "EXHAUST RELAY",
                        gpio = "GPIO ${actuators.relayGpio}",
                        state = actuators.relayState ?: "UNKNOWN"
                    )
                }
            }

            // Physical feedback limitation note
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
}

@Composable
private fun MetadataItem(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    truncate: Boolean = false,
    highlightColor: Color? = null
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = Color(0x14000000)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 8.5.sp
                ),
                color = TextMuted,
                maxLines = 1
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 11.sp
                ),
                color = highlightColor ?: TextPrimary,
                maxLines = 1,
                overflow = if (truncate) TextOverflow.Ellipsis else TextOverflow.Clip
            )
        }
    }
}

@Composable
private fun ActuatorItem(
    name: String,
    gpio: String,
    state: String
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = "$name ($gpio)",
            style = MaterialTheme.typography.labelSmall.copy(
                fontFamily = FontFamily.Monospace,
                fontSize = 9.sp
            ),
            color = TextSecondary
        )
        Text(
            text = state,
            style = MaterialTheme.typography.labelMedium.copy(
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 11.5.sp
            ),
            color = when (state) {
                "ON" -> WarningAmber
                "OFF" -> TextSecondary
                else -> TextMuted
            }
        )
    }
}
