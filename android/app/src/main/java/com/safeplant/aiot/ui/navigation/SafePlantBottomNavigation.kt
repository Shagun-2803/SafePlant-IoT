package com.safeplant.aiot.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
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
    INCIDENTS("Incidents", Icons.Default.Warning),
    SETTINGS("Settings", Icons.Default.Settings)
}

/**
 * Compact, accessible Android Material 3 Navigation Bar.
 * - Sized cleanly to prevent obscuring content.
 * - Touch targets $\ge 48\text{dp}$.
 * - Handles navigationBars WindowInsets.
 */
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
}
