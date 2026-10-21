package com.safeplant.aiot.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.ui.theme.*

data class HistoryPoint(
    val timestamp: String,
    val value: Float
)

/**
 * SafePlant Historical Telemetry Screen.
 * Displays real stored telemetry trends from SQLite over selectable time windows.
 */
@Composable
fun ReadingsScreen(
    temperatureHistory: List<HistoryPoint>,
    humidityHistory: List<HistoryPoint>,
    gasHistory: List<HistoryPoint>,
    flameEventsCount: Int,
    selectedRange: String,
    onRangeSelected: (String) -> Unit,
    contentPadding: PaddingValues = PaddingValues(0.dp)
) {
    val ranges = listOf("1h", "6h", "24h", "7d")

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
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Header & Time-range Filter Tabs
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "HISTORICAL SENSOR TELEMETRY",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    ),
                    color = TextPrimary
                )

                // Segmented Range Buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0x1FFFFFFF), RoundedCornerShape(10.dp))
                        .padding(3.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    ranges.forEach { range ->
                        val isSelected = range == selectedRange
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(
                                    if (isSelected) EmeraldGreen else Color.Transparent,
                                    RoundedCornerShape(8.dp)
                                )
                                .clickable { onRangeSelected(range) }
                                .padding(vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = range.uppercase(),
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp
                                ),
                                color = if (isSelected) IndustrialBackground else TextSecondary
                            )
                        }
                    }
                }
            }
        }

        // 2. Temperature History Card
        item {
            MetricChartCard(
                title = "Ambient Temperature Trend",
                sensorModel = "DHT11 · GPIO 4",
                unit = "°C",
                accentColor = Color(0xFFF97316),
                history = temperatureHistory,
                warningThreshold = 35f,
                criticalThreshold = 45f
            )
        }

        // 3. Humidity History Card
        item {
            MetricChartCard(
                title = "Relative Humidity Trend",
                sensorModel = "DHT11 · GPIO 4",
                unit = "%RH",
                accentColor = Color(0xFF06B6D4),
                history = humidityHistory,
                warningThreshold = 75f,
                criticalThreshold = 85f
            )
        }

        // 4. Gas / Smoke History Card (Uncalibrated Raw ADC)
        item {
            MetricChartCard(
                title = "Gas & Smoke Level (Raw ADC)",
                sensorModel = "MQ-2 Analog · ADC1_CH0 (Pin 36)",
                unit = "ADC",
                accentColor = WarningAmber,
                history = gasHistory,
                warningThreshold = 1800f,
                criticalThreshold = 2800f,
                subtextNote = "Uncalibrated 12-bit ADC (0–4095). Not calibrated ppm."
            )
        }

        // 5. Optical Flame Sensor Event Counter
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = IndustrialSurface),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(IndustrialSurfaceBorder)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = "Optical Flame Presence Events",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary
                        )
                        Text(
                            text = "KY-026 Active-low digital comparator (GPIO 15)",
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 10.sp
                            ),
                            color = TextSecondary
                        )
                    }

                    Text(
                        text = if (flameEventsCount == 0) "0 TRIGGERS" else "$flameEventsCount FLAME EVENTS",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        ),
                        color = if (flameEventsCount == 0) EmeraldGreen else HazardRed
                    )
                }
            }
        }
    }
}

@Composable
fun MetricChartCard(
    title: String,
    sensorModel: String,
    unit: String,
    accentColor: Color,
    history: List<HistoryPoint>,
    warningThreshold: Float? = null,
    criticalThreshold: Float? = null,
    subtextNote: String? = null
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
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
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                    Text(
                        text = sensorModel,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontSize = 10.sp
                        ),
                        color = TextSecondary
                    )
                }

                if (history.isNotEmpty()) {
                    val latest = history.last().value
                    Text(
                        text = "${"%.1f".format(latest)} $unit",
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp
                        ),
                        color = accentColor
                    )
                } else {
                    Text(
                        text = "No Packets",
                        style = MaterialTheme.typography.bodySmall.copy(
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp
                        ),
                        color = TextMuted
                    )
                }
            }

            // Canvas Line Chart
            if (history.size >= 2) {
                val values = history.map { it.value }
                val minVal = values.minOrNull() ?: 0f
                val maxVal = (values.maxOrNull() ?: 100f).coerceAtLeast(minVal + 1f)

                Canvas(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                ) {
                    val w = size.width
                    val h = size.height

                    val points = history.mapIndexed { index, pt ->
                        val x = (index.toFloat() / (history.size - 1)) * w
                        val normalizedY = (pt.value - minVal) / (maxVal - minVal)
                        val y = h - (normalizedY * h * 0.85f) - (h * 0.05f)
                        Offset(x, y)
                    }

                    val path = Path().apply {
                        moveTo(points[0].x, points[0].y)
                        for (i in 1 until points.size) {
                            lineTo(points[i].x, points[i].y)
                        }
                    }

                    drawPath(
                        path = path,
                        color = accentColor,
                        style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                    )
                }

                // Min, Avg, Max Stats Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    val avgVal = values.average().toFloat()
                    StatSummaryItem(label = "MIN", value = "%.1f %s".format(minVal, unit))
                    StatSummaryItem(label = "AVG", value = "%.1f %s".format(avgVal, unit))
                    StatSummaryItem(label = "MAX", value = "%.1f %s".format(maxVal, unit))
                }
            } else {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0x0AFFFFFF)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "Awaiting continuous telemetry from ESP32...",
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 11.sp
                            ),
                            color = TextMuted
                        )
                    }
                }
            }

            subtextNote?.let { note ->
                Text(
                    text = note,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 9.5.sp
                    ),
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
fun StatSummaryItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontFamily = FontFamily.Monospace,
                fontSize = 9.sp
            ),
            color = TextMuted
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall.copy(
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp
            ),
            color = TextPrimary
        )
    }
}
