package com.safeplant.aiot.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material.icons.filled.Whatshot
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
                    text = "${sensor.hardwareModel} · ${sensor.gpioPin}",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 10.sp
                    ),
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )

                // Dedicated, clean status pill that never crowds the title
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
                            if (sensor.category == "gas") "${sensor.value.toInt()}"
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
                            text = "Warn: ${sensor.warningThreshold.toInt()}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 9.5.sp
                            ),
                            color = WarningAmber
                        )
                    }
                    if (sensor.criticalThreshold != null) {
                        Text(
                            text = "Crit: ${sensor.criticalThreshold.toInt()}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 9.5.sp
                            ),
                            color = HazardRed
                        )
                    }
                }
            }

            // Row 4: Sub-info footer (calibration notes or hardware verification)
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
}
