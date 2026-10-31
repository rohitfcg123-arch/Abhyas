package com.shortstop.app

import android.accessibilityservice.AccessibilityService
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.SystemClock
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.TextView
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ShortsBlockerService : AccessibilityService() {
    private var lastBlockedAt = 0L
    private var lastBlockedPackage = ""
    private var lastSignature = ""
    private var lastCountedSignature = ""
    private var lastCountedAt = 0L
    private var counterView: TextView? = null
    private var windowManager: WindowManager? = null
    private var currentMediaApp = ""

    override fun onServiceConnected() {
        super.onServiceConnected()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val currentPackage = event.packageName?.toString() ?: return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            event.eventType != AccessibilityEvent.TYPE_VIEW_SCROLLED) return

        if (currentPackage != packageName && isSelectedForBlocking(currentPackage)) {
            hideCounter()
            val now = SystemClock.elapsedRealtime()
            if (currentPackage != lastBlockedPackage || now - lastBlockedAt > 1800) {
                lastBlockedAt = now
                lastBlockedPackage = currentPackage
                performGlobalAction(GLOBAL_ACTION_HOME)
            }
            return
        }

        val isYoutube = currentPackage == YOUTUBE_PACKAGE
        val isInstagram = currentPackage == INSTAGRAM_PACKAGE
        if (!isYoutube && !isInstagram) {
            hideCounter()
            return
        }

        val preferences = getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE)
        val shortsEnabled = preferences.getBoolean(MainActivity.KEY_SHORTS_BLOCKING_ENABLED, true)
        val blockedChannels = preferences.getStringSet(MainActivity.KEY_BLOCKED_CHANNELS, emptySet())
            ?.map { it.trim().lowercase().replace(Regex("\\s+"), " ") }
            ?.filter { it.isNotBlank() } ?: emptyList()
        val root = rootInActiveWindow ?: return
        val labels = mutableListOf<String>()
        collectLabels(root, labels, 0)
        val normalised = labels.map { it.lowercase().trim().replace(Regex("\\s+"), " ") }.filter { it.isNotBlank() }

        if (isYoutube && blockedChannels.isNotEmpty()) {
            val matchedChannel = blockedChannels.any { channel ->
                normalised.any { label ->
                    label == channel || label == "by $channel" ||
                        label == "channel: $channel" ||
                        label.startsWith("$channel ·") || label.startsWith("$channel •")
                }
            }
            val now = SystemClock.elapsedRealtime()
            if (matchedChannel && now - lastBlockedAt > 1800) {
                lastBlockedAt = now
                lastBlockedPackage = YOUTUBE_PACKAGE
                hideCounter()
                performGlobalAction(GLOBAL_ACTION_HOME)
                return
            }
        }

        if (isYoutube && !shortsEnabled) {
            hideCounter()
            return
        }

        val isReelScreen = if (isYoutube) looksLikeShorts(normalised) else looksLikeInstagramReel(normalised)
        if (!isReelScreen) {
            hideCounter()
            return
        }

        val signature = mediaSignature(normalised)
        if (signature.isBlank()) return
        val now = SystemClock.elapsedRealtime()
        if (signature != lastCountedSignature && now - lastCountedAt > 650) {
            lastCountedSignature = signature
            lastCountedAt = now
            incrementCount(if (isYoutube) TYPE_SHORTS else TYPE_REELS)
        }

        currentMediaApp = if (isYoutube) TYPE_SHORTS else TYPE_REELS
        val stats = getStats()
        val limit = preferences.getInt(
            if (isYoutube) MainActivity.KEY_SHORTS_DAILY_LIMIT else MainActivity.KEY_REELS_DAILY_LIMIT,
            DEFAULT_DAILY_LIMIT
        ).coerceAtLeast(0)
        val used = if (isYoutube) stats.shorts else stats.reels
        if (limit > 0 && used >= limit) {
            showCounter(stats, "Daily limit reached")
            if (signature != lastSignature && now - lastBlockedAt > 1200) {
                lastBlockedAt = now
                lastBlockedPackage = currentPackage
                lastSignature = signature
                performGlobalAction(GLOBAL_ACTION_BACK)
            }
        } else {
            showCounter(stats, null)
            lastSignature = ""
        }
    }

    private fun looksLikeShorts(labels: List<String>): Boolean {
        val hasShorts = labels.any {
            it == "shorts" || it.contains("shorts video") ||
                it.contains("remix") || it.contains("use this sound") || it.contains("add sound")
        }
        val verticalActions = listOf("comments", "dislike", "share").count { token ->
            labels.any { it.contains(token) }
        } >= 2
        val remix = labels.any { it.contains("remix") || it.contains("use this sound") }
        return hasShorts && verticalActions && (remix || labels.any { it.contains("shorts video") })
    }

    private fun looksLikeInstagramReel(labels: List<String>): Boolean {
        val reelContext = labels.any { it == "reels" || it.contains("reel") || it.contains("reels video") }
        val verticalActions = listOf("like", "comment", "share", "send", "audio").count { token ->
            labels.any { it.contains(token) }
        } >= 3
        return reelContext && verticalActions
    }

    private fun mediaSignature(labels: List<String>): String {
        val ignored = setOf("like", "liked", "comment", "comments", "share", "send", "follow",
            "following", "reels", "shorts", "home", "search", "profile", "audio", "more")
        val meaningful = labels.filter { it !in ignored && it.length > 2 &&
            !it.matches(Regex("[0-9,.kmb]+")) }
            .distinct().take(24)
        return meaningful.joinToString("|").hashCode().toString()
    }

    private fun incrementCount(type: String) {
        val prefs = getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE)
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val storedDay = prefs.getString(KEY_STATS_DATE, null)
        val editor = prefs.edit()
        if (storedDay != today) {
            editor.putString(KEY_STATS_DATE, today).putInt(KEY_SHORTS_COUNT, 0).putInt(KEY_REELS_COUNT, 0)
        }
        if (type == TYPE_SHORTS) {
            val count = if (storedDay == today) prefs.getInt(KEY_SHORTS_COUNT, 0) else 0
            editor.putInt(KEY_SHORTS_COUNT, count + 1)
        } else {
            val count = if (storedDay == today) prefs.getInt(KEY_REELS_COUNT, 0) else 0
            editor.putInt(KEY_REELS_COUNT, count + 1)
        }
        editor.apply()
    }

    private data class Stats(val shorts: Int, val reels: Int)

    private fun getStats(): Stats {
        val prefs = getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE)
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        if (prefs.getString(KEY_STATS_DATE, null) != today) {
            prefs.edit().putString(KEY_STATS_DATE, today)
                .putInt(KEY_SHORTS_COUNT, 0).putInt(KEY_REELS_COUNT, 0).apply()
            return Stats(0, 0)
        }
        return Stats(prefs.getInt(KEY_SHORTS_COUNT, 0), prefs.getInt(KEY_REELS_COUNT, 0))
    }

    private fun showCounter(stats: Stats, message: String?) {
        val prefs = getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE)
        val shortsLimit = prefs.getInt(MainActivity.KEY_SHORTS_DAILY_LIMIT, DEFAULT_DAILY_LIMIT)
        val reelsLimit = prefs.getInt(MainActivity.KEY_REELS_DAILY_LIMIT, DEFAULT_DAILY_LIMIT)
        val text = if (message != null) {
            "LIMIT REACHED  •  Shorts ${stats.shorts}/$shortsLimit  |  Reels ${stats.reels}/$reelsLimit"
        } else {
            "SHORTS  ${stats.shorts}/$shortsLimit     REELS  ${stats.reels}/$reelsLimit"
        }
        val view = counterView ?: TextView(this).also {
            it.textSize = 12f
            it.setTextColor(Color.WHITE)
            it.typeface = Typeface.DEFAULT_BOLD
            it.setPadding(dp(13), dp(9), dp(13), dp(9))
            it.background = GradientDrawable().apply {
                setColor(0xE6101628.toInt())
                cornerRadius = dp(18).toFloat()
                setStroke(dp(1), if (message != null) 0xFFFF6B6B.toInt() else 0xFF56E7BE.toInt())
            }
            counterView = it
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                android.graphics.PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                y = dp(42)
            }
            try { windowManager?.addView(it, params) } catch (_: Exception) { counterView = null }
        }
        view.text = text
        view.background = GradientDrawable().apply {
            setColor(0xE6101628.toInt())
            cornerRadius = dp(18).toFloat()
            setStroke(dp(1), if (message != null) 0xFFFF6B6B.toInt() else 0xFF56E7BE.toInt())
        }
    }

    private fun hideCounter() {
        val view = counterView ?: return
        try { windowManager?.removeView(view) } catch (_: Exception) { }
        counterView = null
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun isSelectedForBlocking(packageName: String): Boolean {
        if (packageName == this.packageName) return false
        val selected = getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE)
            .getStringSet(MainActivity.KEY_BLOCKED_PACKAGES, emptySet())
        return selected?.contains(packageName) == true
    }

    private fun collectLabels(node: AccessibilityNodeInfo?, out: MutableList<String>, depth: Int) {
        if (node == null || depth > 18 || out.size > 500) return
        node.text?.toString()?.let { out.add(it) }
        node.contentDescription?.toString()?.let { out.add(it) }
        for (i in 0 until node.childCount) collectLabels(node.getChild(i), out, depth + 1)
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        hideCounter()
        super.onDestroy()
    }

    companion object {
        private const val YOUTUBE_PACKAGE = "com.google.android.youtube"
        private const val INSTAGRAM_PACKAGE = "com.instagram.android"
        private const val TYPE_SHORTS = "shorts"
        private const val TYPE_REELS = "reels"
        private const val DEFAULT_DAILY_LIMIT = 30
        private const val KEY_STATS_DATE = "daily_media_stats_date"
        private const val KEY_SHORTS_COUNT = "daily_shorts_count"
        private const val KEY_REELS_COUNT = "daily_reels_count"
    }
}
