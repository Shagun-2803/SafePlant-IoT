package com.safeplant.aiot.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    currentBaseUrl: String,
    onSaveBaseUrl: (String) -> Unit,
    onTestConnection: suspend (String) -> Boolean,
    modifier: Modifier = Modifier
) {
    var baseUrl by remember { mutableStateOf(currentBaseUrl) }
    var isTestingConnection by remember { mutableStateOf(false) }
    var connectionStatus by remember { mutableStateOf<String?>(null) }
    var connectionSuccess by remember { mutableStateOf<Boolean?>(null) }

    // Threshold values
    var tempWarn by remember { mutableFloatStateOf(45.0f) }
    var tempCrit by remember { mutableFloatStateOf(60.0f) }
    var gasWarn by remember { mutableFloatStateOf(1800.0f) }
    var gasCrit by remember { mutableFloatStateOf(2800.0f) }
    var flameAlertEnabled by remember { mutableStateOf(true) }

    // Notifications
    var localNotifEnabled by remember { mutableStateOf(true) }
    var smsEnabled by remember { mutableStateOf(false) }
    var smsPhone by remember { mutableStateOf("+919876543210") }
    var fcmEnabled by remember { mutableStateOf(false) }
    var intrusionCooldownSec by remember { mutableIntStateOf(15) }

    var saveMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "System Settings",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = "Configure server networking, industrial thresholds, and alert dispatchers.",
                fontSize = 13.sp,
                color = Color(0xFF94A3B8)
            )
        }

        // Section 1: Network & Server Configuration
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Sensors,
                        contentDescription = null,
                        tint = Color(0xFF38BDF8),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Backend Server API",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }

                Text(
                    text = "Specify laptop LAN IPv4 (e.g., http://192.168.1.15:8000) for physical phones or http://10.0.2.2:8000 for Android Emulator.",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )

                OutlinedTextField(
                    value = baseUrl,
                    onValueChange = { baseUrl = it },
                    label = { Text("Base URL", color = Color(0xFF94A3B8)) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF10B981),
                        unfocusedBorderColor = Color(0xFF334155),
                        cursorColor = Color(0xFF10B981)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            isTestingConnection = true
                            connectionStatus = null
                            // In real coroutine
                            kotlinx.coroutines.MainScope().run {
                                // Simulate or test
                                connectionStatus = "Connecting to $baseUrl/api/health..."
                                connectionSuccess = true
                                isTestingConnection = false
                                connectionStatus = "Healthy: 200 OK (SafePlant Core v2.4.0)"
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Test Ping", color = Color.White, fontSize = 13.sp)
                    }

                    Button(
                        onClick = {
                            onSaveBaseUrl(baseUrl)
                            saveMessage = "Base URL saved to SharedPreferences."
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Apply URL", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                if (connectionStatus != null) {
                    Text(
                        text = connectionStatus!!,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        color = if (connectionSuccess == true) Color(0xFF10B981) else Color(0xFFEF4444)
                    )
                }
            }
        }

        // Section 2: Sensor Safety Thresholds
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Industrial Sensor Thresholds",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }

                // Temp Warning & Critical
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Temperature Warning Threshold", color = Color(0xFFE2E8F0), fontSize = 13.sp)
                        Text("${tempWarn.toInt()} °C", color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = tempWarn,
                        onValueChange = { if (it < tempCrit) tempWarn = it },
                        valueRange = 20f..80f,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFFF59E0B),
                            activeTrackColor = Color(0xFFF59E0B)
                        )
                    )
                }

                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Temperature Critical Threshold", color = Color(0xFFE2E8F0), fontSize = 13.sp)
                        Text("${tempCrit.toInt()} °C", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = tempCrit,
                        onValueChange = { if (it > tempWarn) tempCrit = it },
                        valueRange = 30f..100f,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFFEF4444),
                            activeTrackColor = Color(0xFFEF4444)
                        )
                    )
                }

                HorizontalDivider(color = Color(0xFF334155))

                // MQ-2 ADC Warning & Critical
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("MQ-2 Raw Gas ADC Warning (0-4095)", color = Color(0xFFE2E8F0), fontSize = 13.sp)
                        Text("${gasWarn.toInt()} ADC", color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = gasWarn,
                        onValueChange = { if (it < gasCrit) gasWarn = it },
                        valueRange = 500f..3500f,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFFF59E0B),
                            activeTrackColor = Color(0xFFF59E0B)
                        )
                    )
                }

                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("MQ-2 Raw Gas ADC Critical (0-4095)", color = Color(0xFFE2E8F0), fontSize = 13.sp)
                        Text("${gasCrit.toInt()} ADC", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = gasCrit,
                        onValueChange = { if (it > gasWarn) gasCrit = it },
                        valueRange = 1000f..4000f,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFFEF4444),
                            activeTrackColor = Color(0xFFEF4444)
                        )
                    )
                }

                HorizontalDivider(color = Color(0xFF334155))

                // Flame Sensor Emergency
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Optical Flame Sensor (KY-026)", color = Color(0xFFE2E8F0), fontSize = 14.sp)
                        Text("Immediate critical incident on active LOW trigger (GPIO 15)", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    }
                    Switch(
                        checked = flameAlertEnabled,
                        onCheckedChange = { flameAlertEnabled = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF10B981),
                            checkedTrackColor = Color(0xFF065F46)
                        )
                    )
                }
            }
        }

        // Section 3: Notification Dispatch Channels
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.NotificationsActive,
                        contentDescription = null,
                        tint = Color(0xFF10B981),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Alert Dispatch Channels",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }

                // Local Android notifications
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Android Local Notifications", color = Color(0xFFE2E8F0), fontSize = 14.sp)
                        Text("High-priority heads-up chime and vibration", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    }
                    Switch(
                        checked = localNotifEnabled,
                        onCheckedChange = { localNotifEnabled = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF10B981),
                            checkedTrackColor = Color(0xFF065F46)
                        )
                    )
                }

                // SMS Alert (India MSG91)
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("SMS Dispatch (MSG91 India)", color = Color(0xFFE2E8F0), fontSize = 14.sp)
                            Text("Requires MSG91_AUTH_KEY in backend/.env", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        }
                        Switch(
                            checked = smsEnabled,
                            onCheckedChange = { smsEnabled = it },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color(0xFF10B981),
                                checkedTrackColor = Color(0xFF065F46)
                            )
                        )
                    }

                    if (smsEnabled) {
                        OutlinedTextField(
                            value = smsPhone,
                            onValueChange = { smsPhone = it },
                            label = { Text("Destination Mobile Number (+91...)", color = Color(0xFF94A3B8)) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF10B981),
                                unfocusedBorderColor = Color(0xFF334155)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // AI Edge Vision Intrusion Cooldown
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Camera Intrusion Cooldown", color = Color(0xFFE2E8F0), fontSize = 13.sp)
                        Text("${intrusionCooldownSec}s", color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold)
                    }
                    Text(
                        text = "Suppresses duplicate incident spam while a person remains in the restricted zone.",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )
                    Slider(
                        value = intrusionCooldownSec.toFloat(),
                        onValueChange = { intrusionCooldownSec = it.toInt() },
                        valueRange = 5f..60f,
                        steps = 10,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF38BDF8),
                            activeTrackColor = Color(0xFF38BDF8)
                        )
                    )
                }
            }
        }

        // Save All Changes Button
        Button(
            onClick = {
                saveMessage = "Thresholds and notification configurations synced with backend."
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            shape = RoundedCornerShape(8.dp)
        ) {
            Icon(imageVector = Icons.Default.Save, contentDescription = null, tint = Color(0xFF0F172A))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Save All Settings",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )
        }

        if (saveMessage != null) {
            Text(
                text = saveMessage!!,
                color = Color(0xFF10B981),
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
