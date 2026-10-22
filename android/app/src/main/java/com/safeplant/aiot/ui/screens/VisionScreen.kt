package com.safeplant.aiot.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * VisionScreen wrapper aliasing CameraVisionScreen for flexible navigation imports.
 */
@Composable
fun VisionScreen(
    onIntrusionDetected: (Float, String) -> Unit,
    modifier: Modifier = Modifier
) {
    CameraVisionScreen(
        onIntrusionDetected = onIntrusionDetected,
        modifier = modifier
    )
}
