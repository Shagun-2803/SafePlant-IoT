package com.safeplant.aiot.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = EmeraldGreen,
    onPrimary = IndustrialBackground,
    primaryContainer = EmeraldGreenSubtle,
    onPrimaryContainer = EmeraldGreen,
    secondary = WarningAmber,
    onSecondary = IndustrialBackground,
    error = HazardRed,
    onError = IndustrialBackground,
    background = IndustrialBackground,
    onBackground = TextPrimary,
    surface = IndustrialSurface,
    onSurface = TextPrimary
)

@Composable
fun SafePlantTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
