package com.shortstop.app

import android.accessibilityservice.AccessibilityService
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var appList: LinearLayout
    private val prefs by lazy { getSharedPreferences(PREFS_NAME, MODE_PRIVATE) }
    private val blockedPackages = mutableSetOf<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        loadBlockedPackages()
        render()
    }

    override fun onResume() {
        super.onResume()
        if (::status.isInitialized) updateStatus()
    }

    private fun render() {
        val pad = (20 * resources.displayMetrics.density).toInt()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }
        val title = TextView(this).apply {
            text = "ShortStop"
            textSize = 30f
            gravity = Gravity.CENTER
            setTextColor(0xFF182230.toInt())
        }
        val subtitle = TextView(this).apply {
            text = "Block Shorts and distracting apps"
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, pad / 3, 0, pad / 2)
        }
        status = TextView(this).apply {
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(0, pad / 2, 0, pad / 2)
        }
        val enable = Button(this).apply {
            text = "Enable blocking permission"
            setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }
        val heading = TextView(this).apply {
            text = "Choose apps to block"
            textSize = 20f
            setTextColor(0xFF182230.toInt())
            setPadding(0, pad, 0, pad / 3)
        }
        val help = TextView(this).apply {
            text = "Selected apps will be sent back to the home screen when opened. Your choices are saved on this phone."
            textSize = 14f
            setPadding(0, 0, 0, pad / 2)
        }
        appList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val scroll = ScrollView(this).apply {
            addView(appList, ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ))
        }
        val refresh = Button(this).apply {
            text = "Refresh app list"
            setOnClickListener { populateApps() }
        }

        layout.addView(title, fullWidth())
        layout.addView(subtitle, fullWidth())
        layout.addView(status, fullWidth())
        layout.addView(enable, fullWidth())
        layout.addView(heading, fullWidth())
        layout.addView(help, fullWidth())
        layout.addView(scroll, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ))
        layout.addView(refresh, fullWidth())
        setContentView(layout)
        populateApps()
        updateStatus()
    }

    private fun populateApps() {
        if (!::appList.isInitialized) return
        appList.removeAllViews()
        val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = packageManager.queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL)
            .mapNotNull { info ->
                val packageName = info.activityInfo?.packageName ?: return@mapNotNull null
                if (packageName == packageName()) return@mapNotNull null
                val label = info.loadLabel(packageManager)?.toString()?.trim().orEmpty()
                if (label.isBlank()) null else packageName to label
            }
            .distinctBy { it.first }
            .sortedBy { it.second.lowercase() }

        if (apps.isEmpty()) {
            appList.addView(TextView(this).apply { text = "No launchable apps found." })
            return
        }
        apps.forEach { (pkg, label) ->
            val check = CheckBox(this).apply {
                text = label
                textSize = 16f
                isChecked = blockedPackages.contains(pkg)
                setPadding(0, 5, 0, 5)
                setOnCheckedChangeListener { _, checked ->
                    if (checked) blockedPackages.add(pkg) else blockedPackages.remove(pkg)
                    persistBlockedPackages()
                    updateStatus()
                }
            }
            appList.addView(check, fullWidth())
        }
    }

    private fun packageName(): String = applicationContext.packageName

    private fun loadBlockedPackages() {
        blockedPackages.clear()
        blockedPackages.addAll(
            prefs.getStringSet(KEY_BLOCKED_PACKAGES, emptySet())?.toSet() ?: emptySet()
        )
        blockedPackages.remove(packageName())
    }

    private fun persistBlockedPackages() {
        prefs.edit().putStringSet(KEY_BLOCKED_PACKAGES, blockedPackages.toSet()).apply()
    }

    private fun fullWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    )

    private fun updateStatus() {
        if (!::status.isInitialized) return
        val enabled = isServiceEnabled()
        status.text = "Blocker: " + if (enabled) "ENABLED" else "NOT ENABLED — enable it below"
        status.append("\nApps selected: ${blockedPackages.size}")
    }

    private fun isServiceEnabled(): Boolean {
        val expected = packageName() + "/" + ShortsBlockerService::class.java.name
        val enabled = Settings.Secure.getString(
            contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabled)
        while (splitter.hasNext()) {
            if (splitter.next().equals(expected, ignoreCase = true)) return true
        }
        return false
    }

    companion object {
        const val PREFS_NAME = "shortstop_settings"
        const val KEY_BLOCKED_PACKAGES = "blocked_packages"
    }
}
