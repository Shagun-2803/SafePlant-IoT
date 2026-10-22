package com.safeplant.aiot.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.data.model.IncidentRecord
import com.safeplant.aiot.ui.theme.*

/**
 * SafePlant Incidents Screen.
 * Full audit lifecycle tracking: Open, Acknowledged, and Resolved states.
 * Supports filtering by status and severity, with Acknowledge and Resolve actions.
 */
@Composable
fun IncidentsScreen(
    incidents: List<IncidentRecord>,
    onAcknowledge: (String) -> Unit,
    onResolve: (String, String) -> Unit,
    contentPadding: PaddingValues = PaddingValues(0.dp)
) {
    var selectedFilter by remember { mutableStateOf("all") }
    var selectedSeverity by remember { mutableStateOf("all") }
    var resolvingIncidentId by remember { mutableStateOf<String?>(null) }
    var resolutionNotes by remember { mutableStateOf("") }

    val filteredIncidents = incidents.filter { item ->
        val matchesStatus = when (selectedFilter) {
            "all" -> true
            "open" -> item.status == "open"
            "acknowledged" -> item.status == "acknowledged"
            "resolved" -> item.status == "resolved"
            else -> true
        }
        val matchesSeverity = when (selectedSeverity) {
            "all" -> true
            else -> item.severity == selectedSeverity
        }
        matchesStatus && matchesSeverity
    }

    // Resolution Notes Dialog
    if (resolvingIncidentId != null) {
        AlertDialog(
            onDismissRequest = { resolvingIncidentId = null },
            title = {
                Text(
                    text = "RESOLVE SAFETY INCIDENT",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    ),
                    color = TextPrimary
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Enter corrective actions taken and verification notes:",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                    OutlinedTextField(
                        value = resolutionNotes,
                        onValueChange = { resolutionNotes = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("e.g., Gas leak isolated, area ventilated, normal readings confirmed.") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = EmeraldGreen,
                            unfocusedBorderColor = IndustrialSurfaceBorder,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val id = resolvingIncidentId ?: return@Button
                        onResolve(id, resolutionNotes.ifBlank { "Safety condition cleared and verified." })
                        resolvingIncidentId = null
                        resolutionNotes = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                ) {
                    Text("SUBMIT RESOLUTION", color = IndustrialBackground, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { resolvingIncidentId = null }) {
                    Text("CANCEL", color = TextSecondary)
                }
            },
            containerColor = IndustrialSurface,
            shape = RoundedCornerShape(16.dp)
        )
    }

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
        // 1. Header & Filters
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "SAFETY INCIDENT AUDIT LOG",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    ),
                    color = TextPrimary
                )

                // Status Filter Chips
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("all", "open", "acknowledged", "resolved").forEach { status ->
                        val isSelected = selectedFilter == status
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) EmeraldGreen else Color(0x1AFFFFFF),
                            modifier = Modifier.clickable { selectedFilter = status }
                        ) {
                            Text(
                                text = status.uppercase(),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                ),
                                color = if (isSelected) IndustrialBackground else TextSecondary
                            )
                        }
                    }
                }
            }
        }

        // 2. Incident Items List
        if (filteredIncidents.isEmpty()) {
            item {
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
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "All Clear",
                            tint = EmeraldGreen,
                            modifier = Modifier.size(36.dp)
                        )
                        Text(
                            text = "No Incidents Recorded",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            color = TextPrimary
                        )
                        Text(
                            text = "All environmental thresholds within calibrated safe limits.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }
            }
        } else {
            items(filteredIncidents, key = { it.id }) { incident ->
                IncidentCardItem(
                    incident = incident,
                    onAcknowledge = { onAcknowledge(incident.id) },
                    onStartResolve = { resolvingIncidentId = incident.id }
                )
            }
        }
    }
}

@Composable
fun IncidentCardItem(
    incident: IncidentRecord,
    onAcknowledge: () -> Unit,
    onStartResolve: () -> Unit
) {
    val isCritical = incident.severity == "critical"
    val isResolved = incident.status == "resolved"
    val isAck = incident.status == "acknowledged"

    val borderColor = when {
        isResolved -> Color(0x3310E575)
        isCritical -> HazardRed
        else -> WarningAmber
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = IndustrialSurface),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(borderColor.copy(alpha = 0.5f))
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Top Row: Severity & Status Badges + Timestamp
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isCritical) HazardRedBg else WarningAmberBg
                    ) {
                        Text(
                            text = incident.severity.uppercase(),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp
                            ),
                            color = if (isCritical) HazardRed else WarningAmber
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = when (incident.status) {
                            "resolved" -> Color(0x2210E575)
                            "acknowledged" -> Color(0x2238BDF8)
                            else -> HazardRedBg
                        }
                    ) {
                        Text(
                            text = incident.status.uppercase(),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp
                            ),
                            color = when (incident.status) {
                                "resolved" -> EmeraldGreen
                                "acknowledged" -> Color(0xFF38BDF8)
                                else -> HazardRed
                            }
                        )
                    }
                }

                Text(
                    text = incident.timestamp.take(19).replace("T", " "),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 9.5.sp
                    ),
                    color = TextMuted
                )
            }

            // Title & Description
            Text(
                text = incident.title,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                color = TextPrimary
            )
            Text(
                text = incident.description,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )

            // Triggering Metric Snapshot
            if (incident.triggeringValue != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0x0DFFFFFF),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "TRIGGER: ${incident.triggeringValue}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            ),
                            color = if (isCritical) HazardRed else WarningAmber
                        )
                        incident.thresholdValue?.let { thresh ->
                            Text(
                                text = "LIMIT: $thresh",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 10.sp
                                ),
                                color = TextMuted
                            )
                        }
                    }
                }
            }

            // Audit Trail Details (Acknowledged / Resolved Notes)
            if (incident.acknowledged && incident.acknowledgedBy != null) {
                Text(
                    text = "Acknowledged by ${incident.acknowledgedBy} at ${incident.acknowledgedAt?.take(16)?.replace("T", " ") ?: "recorded"}",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 9.sp
                    ),
                    color = Color(0xFF38BDF8)
                )
            }

            if (incident.resolved && incident.resolutionNotes != null) {
                Text(
                    text = "Resolution: ${incident.resolutionNotes}",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 9.sp
                    ),
                    color = EmeraldGreen
                )
            }

            // Actions Row
            if (!isResolved) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (!isAck) {
                        OutlinedButton(
                            onClick = onAcknowledge,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF38BDF8))
                            )
                        ) {
                            Text("ACKNOWLEDGE", color = Color(0xFF38BDF8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Button(
                        onClick = onStartResolve,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                    ) {
                        Text("RESOLVE", color = IndustrialBackground, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
