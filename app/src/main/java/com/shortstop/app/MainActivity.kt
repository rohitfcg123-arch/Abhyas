package com.shortstop.app

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Build
import android.util.Rational
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    private var playerWebView: WebView? = null
    private var playerActive = false
    private var fullscreenCustomView: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null
    private var previousSystemUiVisibility = 0
    private var previousRequestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    private lateinit var status: TextView
    private lateinit var count: TextView
    private lateinit var appList: LinearLayout
    private lateinit var search: EditText
    private val prefs by lazy { getSharedPreferences(PREFS_NAME, MODE_PRIVATE) }
    private val blockedPackages = mutableSetOf<String>()
    private var allApps: List<AppEntry> = emptyList()
    private var showAllApps = false

    private data class AppEntry(val packageName: String, val label: String)

    private val bg = Color.rgb(11, 16, 32)
    private val surface = Color.rgb(22, 29, 50)
    private val surface2 = Color.rgb(30, 39, 65)
    private val white = Color.rgb(245, 247, 255)
    private val muted = Color.rgb(160, 171, 198)
    private val accent = Color.rgb(139, 111, 255)
    private val mint = Color.rgb(86, 231, 190)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        window.decorView.systemUiVisibility = 0
        loadBlockedPackages()
        loadRemoteUiOrFallback()
    }

    override fun onResume() {
        super.onResume()
        if (::status.isInitialized) updateStatus()
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        val web = playerWebView ?: return
        if (!playerActive || isInPictureInPictureMode) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            web.evaluateJavascript("document.body.classList.add('pip-mode')", null)
            try {
                enterPictureInPictureMode(
                    PictureInPictureParams.Builder()
                        .setAspectRatio(Rational(16, 9))
                        .build()
                )
            } catch (_: Exception) {
                web.evaluateJavascript("document.body.classList.remove('pip-mode')", null)
            }
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: android.content.res.Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (!isInPictureInPictureMode) {
            playerWebView?.evaluateJavascript("document.body.classList.remove('pip-mode')", null)
        }
    }

    private fun showFullscreenVideo(view: View, callback: WebChromeClient.CustomViewCallback) {
        if (fullscreenCustomView != null) {
            callback.onCustomViewHidden()
            return
        }
        fullscreenCustomView = view
        fullscreenCallback = callback
        previousSystemUiVisibility = window.decorView.systemUiVisibility
        previousRequestedOrientation = requestedOrientation
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        val decor = window.decorView as? FrameLayout
        decor?.addView(view, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
    }

    private fun hideFullscreenVideo() {
        val view = fullscreenCustomView ?: return
        (window.decorView as? FrameLayout)?.removeView(view)
        fullscreenCustomView = null
        fullscreenCallback?.onCustomViewHidden()
        fullscreenCallback = null
        window.decorView.systemUiVisibility = previousSystemUiVisibility
        requestedOrientation = previousRequestedOrientation
    }

    private fun render() {
        val pad = dp(16)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(bg)
        }
        val scroll = ScrollView(this).apply {
            isFillViewport = true
            clipToPadding = false
            setPadding(0, 0, 0, dp(10))
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, dp(18), pad, dp(20))
        }

        val brandRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val logo = ImageView(this).apply {
            setImageResource(R.drawable.ic_focusfence)
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        brandRow.addView(logo, LinearLayout.LayoutParams(dp(52), dp(52)))
        val brandText = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), 0, 0, 0)
        }
        brandText.addView(label("FOCUSFENCE", 19f, white, true))
        brandText.addView(label("YOUR ATTENTION. YOUR RULES.", 10f, muted, true).apply {
            letterSpacing = 0.08f
            setPadding(0, dp(3), 0, 0)
        })
        brandRow.addView(brandText, LinearLayout.LayoutParams(0, -2, 1f))
        brandRow.addView(pill("BETA", accent, white))
        content.addView(brandRow)

        val hero = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = roundedGradient(
                intArrayOf(Color.rgb(43, 43, 91), Color.rgb(27, 46, 78)), 26
            )
            setPadding(dp(16), dp(15), dp(16), dp(15))
        }
        hero.addView(label("Take back your time.", 23f, white, true))
        hero.addView(label("Choose the apps that distract you.\nWe'll help you stay on track.", 14f, Color.rgb(205, 211, 238), false).apply {
            setPadding(0, dp(8), 0, dp(18))
            setLineSpacing(dp(3).toFloat(), 1f)
        })
        status = label("", 14f, white, true)
        status.setPadding(dp(12), dp(11), dp(12), dp(11))
        status.background = rounded(Color.rgb(36, 54, 78), 14)
        hero.addView(status, LinearLayout.LayoutParams(-1, -2))
        val enable = actionButton("Enable accessibility  →", accent)
        enable.setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        val enableParams = LinearLayout.LayoutParams(-1, dp(50)).apply { topMargin = dp(12) }
        hero.addView(enable, enableParams)
        val warning = label("Required for blocking to work", 12f, Color.rgb(200, 206, 230), false)
        warning.gravity = Gravity.CENTER
        warning.setPadding(0, dp(8), 0, 0)
        hero.addView(warning)
        val heroParams = LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = dp(12)
        }
        content.addView(hero, heroParams)

        val sectionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(17), 0, dp(10))
        }
        val sectionTitle = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        sectionTitle.addView(label("Block distracting apps", 20f, white, true))
        sectionTitle.addView(label("Select any app from your phone", 12f, muted, false).apply {
            setPadding(0, dp(4), 0, 0)
        })
        sectionRow.addView(sectionTitle, LinearLayout.LayoutParams(0, -2, 1f))
        count = pill("0 SELECTED", mint, bg)
        sectionRow.addView(count)
        content.addView(sectionRow)

        search = EditText(this).apply {
            hint = "  Search installed apps"
            setHintTextColor(muted)
            setTextColor(white)
            textSize = 15f
            isSingleLine = true
            compoundDrawablePadding = dp(8)
            setPadding(dp(15), 0, dp(12), 0)
            background = rounded(surface, 16)
        }
        content.addView(search, LinearLayout.LayoutParams(-1, dp(52)).apply {
            bottomMargin = dp(12)
        })

        val listCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(surface, 18)
            setPadding(dp(12), dp(5), dp(12), dp(5))
        }
        appList = listCard
        content.addView(listCard, LinearLayout.LayoutParams(-1, -2))

        val footer = label("Your selection stays on this device. FocusFence sends selected apps back to Home when opened.", 12f, muted, false)
        footer.gravity = Gravity.CENTER
        footer.setPadding(dp(8), dp(17), dp(8), dp(8))
        content.addView(footer)

        scroll.addView(content, ViewGroup.LayoutParams(-1, -2))
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)

        search.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                showAllApps = !s.isNullOrBlank()
                renderAppRows()
            }
            override fun afterTextChanged(s: Editable?) = Unit
        })
        loadApps()
        renderAppRows()
        updateStatus()
    }


    private fun loadRemoteUiOrFallback() {
        Thread {
            var html: String? = null
            try {
                val connection = (URL(REMOTE_UI_URL).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 4500
                    readTimeout = 4500
                    requestMethod = "GET"
                    setRequestProperty("Cache-Control", "no-cache")
                    setRequestProperty("User-Agent", "FocusFence-Android")
                }
                try {
                    if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                        html = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                    }
                } finally {
                    connection.disconnect()
                }
            } catch (_: Exception) {
                html = null
            }

            if (html != null && html!!.contains("FOCUSFENCE")) {
                prefs.edit().putString(KEY_CACHED_REMOTE_HTML, html).apply()
            } else {
                html = prefs.getString(KEY_CACHED_REMOTE_HTML, null)
            }
            if (html != null && html!!.contains("FOCUSFENCE")) {
                try { loadApps() } catch (_: Exception) { }
            }
            runOnUiThread {
                if (html != null && html!!.contains("FOCUSFENCE")) {
                    val web = WebView(this)
                    playerWebView = web
                    web.setBackgroundColor(bg)
                    web.settings.javaScriptEnabled = true
                    web.settings.domStorageEnabled = false
                    web.settings.allowFileAccess = false
                    web.settings.allowContentAccess = false
                    web.settings.javaScriptCanOpenWindowsAutomatically = false
                    web.addJavascriptInterface(FocusFenceBridge(), "FocusFenceNative")
                    web.webChromeClient = object : WebChromeClient() {
                        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                            if (view != null && callback != null) showFullscreenVideo(view, callback)
                        }

                        override fun onHideCustomView() {
                            hideFullscreenVideo()
                        }
                    }
                    web.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                            // Allow embedded player frames and their media resources, but keep
                            // top-level navigation inside FocusFence.
                            return request?.isForMainFrame != false
                        }
                    }
                    setContentView(web)
                    web.loadDataWithBaseURL(
                        "https://focusfence-ui.local/",
                        html!!,
                        "text/html",
                        "UTF-8",
                        null
                    )
                } else {
                    render()
                }
            }
        }.start()
    }

    private inner class FocusFenceBridge {
        @JavascriptInterface
        fun getAppsJson(): String {
            val array = JSONArray()
            allApps.forEach { app ->
                array.put(JSONObject().put("packageName", app.packageName).put("label", app.label))
            }
            return array.toString()
        }

        @JavascriptInterface
        fun getSelectedPackagesJson(): String = JSONArray(blockedPackages.toList()).toString()

        @JavascriptInterface
        fun setBlocked(packageName: String, blocked: Boolean) {
            if (packageName == ownPackageName() || allApps.none { it.packageName == packageName }) return
            synchronized(blockedPackages) {
                if (blocked) blockedPackages.add(packageName) else blockedPackages.remove(packageName)
                prefs.edit().putStringSet(KEY_BLOCKED_PACKAGES, blockedPackages.toSet()).apply()
            }
        }

        @JavascriptInterface
        fun setPlayerActive(active: Boolean) {
            playerActive = active
        }

        @JavascriptInterface
        fun isProtectionEnabled(): Boolean = isServiceEnabled()

        @JavascriptInterface
        fun isShortsBlockingEnabled(): Boolean =
            prefs.getBoolean(KEY_SHORTS_BLOCKING_ENABLED, true)

        @JavascriptInterface
        fun setShortsBlockingEnabled(enabled: Boolean) {
            prefs.edit().putBoolean(KEY_SHORTS_BLOCKING_ENABLED, enabled).apply()
        }

        @JavascriptInterface
        fun getBlockedChannelsJson(): String =
            JSONArray(prefs.getStringSet(KEY_BLOCKED_CHANNELS, emptySet<String>())?.toList() ?: emptyList<String>()).toString()

        @JavascriptInterface
        fun addBlockedChannel(channelName: String) {
            val clean = channelName.trim().replace(Regex("\\s+"), " ").take(80)
            if (clean.isBlank()) return
            synchronized(prefs) {
                val channels = prefs.getStringSet(KEY_BLOCKED_CHANNELS, emptySet<String>())?.toMutableSet() ?: mutableSetOf<String>()
                if (channels.none { it.equals(clean, ignoreCase = true) }) channels.add(clean)
                prefs.edit().putStringSet(KEY_BLOCKED_CHANNELS, channels).apply()
            }
        }

        @JavascriptInterface
        fun removeBlockedChannel(channelName: String) {
            synchronized(prefs) {
                val channels = prefs.getStringSet(KEY_BLOCKED_CHANNELS, emptySet())?.toMutableSet() ?: mutableSetOf()
                channels.removeAll { it.equals(channelName.trim(), ignoreCase = true) }
                prefs.edit().putStringSet(KEY_BLOCKED_CHANNELS, channels).apply()
            }
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            runOnUiThread {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        }
    }

    private fun loadApps() {
        val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        allApps = packageManager.queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL)
            .mapNotNull { info ->
                val pkg = info.activityInfo?.packageName ?: return@mapNotNull null
                if (pkg == ownPackageName()) return@mapNotNull null
                val appLabel = info.loadLabel(packageManager)?.toString()?.trim().orEmpty()
                if (appLabel.isBlank()) null else AppEntry(pkg, appLabel)
            }
            .distinctBy { it.packageName }
            .sortedBy { it.label.lowercase() }
    }

    private fun renderAppRows() {
        if (!::appList.isInitialized) return
        appList.removeAllViews()
        val query = if (::search.isInitialized) search.text.toString().trim().lowercase() else ""
        val visibleApps = allApps.filter { it.label.lowercase().contains(query) }
        val displayApps = if (showAllApps || query.isNotBlank()) visibleApps else visibleApps.take(25)
        if (visibleApps.isEmpty()) {
            appList.addView(label("No apps match your search.", 14f, muted, false).apply {
                gravity = Gravity.CENTER
                setPadding(dp(16), dp(25), dp(16), dp(25))
            })
            updateCount()
            return
        }
        displayApps.forEachIndexed { index, app ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(3), dp(10), dp(3), dp(10))
                isClickable = true
                isFocusable = true
            }
            val icon = ImageView(this).apply {
                scaleType = ImageView.ScaleType.FIT_CENTER
                try {
                    setImageDrawable(packageManager.getApplicationIcon(app.packageName))
                } catch (_: PackageManager.NameNotFoundException) {
                    setImageResource(R.drawable.ic_focusfence)
                }
            }
            row.addView(icon, LinearLayout.LayoutParams(dp(42), dp(42)))
            val names = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(12), 0, dp(6), 0)
            }
            names.addView(label(app.label, 15f, white, true))
            val stateLabel = label(if (blockedPackages.contains(app.packageName)) "Blocked" else "Allowed", 11f,
                if (blockedPackages.contains(app.packageName)) mint else muted, false).apply {
                setPadding(0, dp(3), 0, 0)
            }
            names.addView(stateLabel)
            row.addView(names, LinearLayout.LayoutParams(0, -2, 1f))
            val check = CheckBox(this).apply {
                buttonTintList = android.content.res.ColorStateList(
                    arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                    intArrayOf(mint, muted)
                )
                isChecked = blockedPackages.contains(app.packageName)
                contentDescription = "Block ${app.label}"
                setOnCheckedChangeListener { _, checked ->
                    if (checked) blockedPackages.add(app.packageName) else blockedPackages.remove(app.packageName)
                    persistBlockedPackages()
                    stateLabel.text = if (checked) "Blocked" else "Allowed"
                    stateLabel.setTextColor(if (checked) mint else muted)
                    updateStatus()
                }
            }
            row.addView(check)
            row.setOnClickListener { check.isChecked = !check.isChecked }
            appList.addView(row, LinearLayout.LayoutParams(-1, -2))
            if (index < displayApps.lastIndex) {
                val divider = View(this).apply { setBackgroundColor(Color.rgb(43, 51, 73)) }
                appList.addView(divider, LinearLayout.LayoutParams(-1, dp(1)))
            }
        }
        if (query.isBlank() && !showAllApps && visibleApps.size > 25) {
            val more = actionButton("Show all installed apps  ↓", surface2).apply {
                textSize = 13f
                setOnClickListener {
                    showAllApps = true
                    renderAppRows()
                }
            }
            appList.addView(more, LinearLayout.LayoutParams(-1, dp(44)).apply {
                topMargin = dp(8)
                bottomMargin = dp(8)
            })
        }
        updateCount()
    }

    private fun updateCount() {
        if (!::count.isInitialized) return
        count.text = "${blockedPackages.size} SELECTED"
    }

    private fun updateStatus() {
        if (!::status.isInitialized) return
        val enabled = isServiceEnabled()
        status.text = if (enabled) "●  PROTECTION IS ON" else "○  PROTECTION IS OFF"
        status.setTextColor(if (enabled) mint else Color.rgb(255, 205, 120))
        status.background = rounded(if (enabled) Color.rgb(27, 66, 67) else Color.rgb(75, 55, 45), 14)
        updateCount()
    }

    private fun isServiceEnabled(): Boolean {
        val expected = ownPackageName() + "/" + ShortsBlockerService::class.java.name
        val enabled = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabled)
        while (splitter.hasNext()) {
            if (splitter.next().equals(expected, ignoreCase = true)) return true
        }
        return false
    }

    private fun ownPackageName(): String = applicationContext.packageName

    private fun loadBlockedPackages() {
        blockedPackages.clear()
        blockedPackages.addAll(prefs.getStringSet(KEY_BLOCKED_PACKAGES, emptySet())?.toSet() ?: emptySet())
        blockedPackages.remove(ownPackageName())
    }

    private fun persistBlockedPackages() {
        prefs.edit().putStringSet(KEY_BLOCKED_PACKAGES, blockedPackages.toSet()).apply()
    }

    private fun label(value: String, size: Float, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
        }

    private fun pill(value: String, color: Int, textColor: Int): TextView =
        TextView(this).apply {
            text = value
            textSize = 10f
            setTextColor(textColor)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(11), dp(8), dp(11), dp(8))
            background = rounded(color, 40)
        }

    private fun actionButton(value: String, color: Int): TextView =
        TextView(this).apply {
            text = value
            textSize = 15f
            setTextColor(Color.WHITE)
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            background = rounded(color, 15)
            isClickable = true
            isFocusable = true
        }

    private fun rounded(color: Int, radiusDp: Int): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radiusDp).toFloat()
        }

    private fun roundedGradient(colors: IntArray, radiusDp: Int): GradientDrawable =
        GradientDrawable(GradientDrawable.Orientation.TL_BR, colors).apply {
            cornerRadius = dp(radiusDp).toFloat()
        }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val PREFS_NAME = "shortstop_settings"
        const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        private const val REMOTE_UI_URL = "https://raw.githubusercontent.com/rohitfcg123-arch/Abhyas/main/focusfence-ui/index.html"
        private const val KEY_CACHED_REMOTE_HTML = "cached_remote_ui_html"
        const val KEY_SHORTS_BLOCKING_ENABLED = "shorts_blocking_enabled"
        const val KEY_BLOCKED_CHANNELS = "blocked_youtube_channels"
    }
}
