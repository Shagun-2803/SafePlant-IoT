package com.safeplant.aiot.network

import com.safeplant.aiot.data.model.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

data class HealthResponse(
    val status: String,
    val service: String,
    val version: String,
    val uptime_seconds: Long,
    val timestamp: String
)

data class BackendStatusDto(
    val status: String,
    val hardware_connected: Boolean,
    val esp32_last_seen: String?,
    val active_sensors_count: Int,
    val firmware_version: String?,
    val rssi: Int?,
    val relay_state: String?,
    val buzzer_state: String?,
    val actuator_mode: String?,
    val gas_unit: String?,
    val fcm_configured: Boolean,
    val sms_configured: Boolean
)

data class TelemetryHistoryDto(
    val range: String,
    val count: Int,
    val history: List<TelemetryPointDto>
)

data class TelemetryPointDto(
    val timestamp: String,
    val temperature: Float?,
    val humidity: Float?,
    val gas: Float?,
    val flame: Int?
)

data class AcknowledgeDto(val acknowledgedBy: String = "Safety Officer")
data class ResolveDto(val notes: String = "Inspected and resolved.")

interface SafePlantApiService {
    @GET("api/health")
    suspend fun getHealth(): Response<HealthResponse>

    @GET("api/status")
    suspend fun getStatus(): Response<BackendStatusDto>

    @GET("api/telemetry/latest")
    suspend fun getLatestTelemetry(): Response<Map<String, Any>>

    @GET("api/telemetry/history")
    suspend fun getTelemetryHistory(
        @Query("range") range: String = "1h",
        @Query("limit") limit: Int = 100
    ): Response<TelemetryHistoryDto>

    @POST("api/telemetry")
    suspend fun sendTelemetry(
        @Body payload: Map<String, Any>
    ): Response<Map<String, Any>>

    @GET("api/incidents")
    suspend fun getIncidents(
        @Query("status") status: String? = null,
        @Query("severity") severity: String? = null
    ): Response<List<Map<String, Any>>>

    @POST("api/incidents/{id}/acknowledge")
    suspend fun acknowledgeIncident(
        @Path("id") id: String,
        @Body body: AcknowledgeDto
    ): Response<Map<String, Any>>

    @POST("api/incidents/{id}/resolve")
    suspend fun resolveIncident(
        @Path("id") id: String,
        @Body body: ResolveDto
    ): Response<Map<String, Any>>

    @GET("api/settings")
    suspend fun getSettings(): Response<Map<String, Any>>

    @PUT("api/settings")
    suspend fun updateSettings(
        @Body settings: Map<String, Any>
    ): Response<Map<String, Any>>

    @POST("api/ai/events")
    suspend fun reportAiEvent(
        @Body event: Map<String, Any>
    ): Response<Map<String, Any>>

    @GET("api/ai/events")
    suspend fun getAiEvents(): Response<List<Map<String, Any>>>

    @GET("api/ai/status")
    suspend fun getAiStatus(): Response<Map<String, Any>>

    companion object {
        fun create(baseUrl: String = "http://10.0.2.2:8000/"): SafePlantApiService {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build()

            val normalizedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
            return Retrofit.Builder()
                .baseUrl(normalizedUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(SafePlantApiService::class.java)
        }
    }
}
