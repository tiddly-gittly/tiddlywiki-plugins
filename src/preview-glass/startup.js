/*\
title: $:/plugins/linonetwo/preview-glass/startup.js
type: application/javascript
module-type: startup

Global event listener for link hover preview
\*/

"use strict";

exports.name = "preview-glass";
exports.platforms = ["browser"];
exports.after = ["render"];
exports.synchronous = true;

exports.startup = function() {
	var PREVIEW_STATE = "$:/state/preview-glass/popup";
	var DEFAULTS_PREFIX = "$:/plugins/linonetwo/preview-glass/defaults/";
	var hoverTimeout = null;
	var currentPreviewTiddler = null;
	
	// Get configuration
	function getConfig(name, defaultValue) {
		var tiddler = $tw.wiki.getTiddler(DEFAULTS_PREFIX + name);
		return tiddler ? tiddler.fields.text : defaultValue;
	}
	
	// Check if tiddler should be excluded from preview
	function shouldExclude(title) {
		if (!title) return true;
		
		var tiddler = $tw.wiki.getTiddler(title);
		
		// Check exclude-system
		if (getConfig("exclude-system", "yes") === "yes") {
			if ($tw.wiki.isSystemTiddler(title)) return true;
		}
		
		// Check exclude-shadows
		if (getConfig("exclude-shadows", "yes") === "yes") {
			if ($tw.wiki.isShadowTiddler(title)) return true;
		}
		
		// Check exclude-empty
		if (getConfig("exclude-empty", "yes") === "yes") {
			if (!tiddler || !tiddler.fields.text) return true;
		}
		
		return false;
	}
	
	// Extract tiddler title from link href
	function getTiddlerFromHref(href) {
		if (!href) return null;
		// href format is like "#TiddlerTitle" or "#Encoded%20Title"
		var hash = href.split("#")[1];
		if (!hash) return null;
		try {
			return decodeURIComponent(hash);
		} catch(e) {
			return hash;
		}
	}
	
	// Show preview
	function showPreview(title, x, y) {
		if (shouldExclude(title)) return;
		
		currentPreviewTiddler = title;
		$tw.wiki.setText(PREVIEW_STATE, "text", null, title);
		$tw.wiki.setText(PREVIEW_STATE, "x", null, String(x));
		$tw.wiki.setText(PREVIEW_STATE, "y", null, String(y));
	}
	
	// Hide preview
	function hidePreview() {
		currentPreviewTiddler = null;
		$tw.wiki.deleteTiddler(PREVIEW_STATE);
	}
	
	// Handle mouseover on links
	document.addEventListener("mouseover", function(event) {
		var target = event.target;
		
		// Find the closest link element
		var link = target.closest ? target.closest(".tc-tiddlylink") : null;
		if (!link) {
			// Also check if target itself is a link
			if (target.classList && target.classList.contains("tc-tiddlylink")) {
				link = target;
			}
		}
		
		if (!link) return;
		
		// Clear any pending timeout
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		
		// Get tiddler title from href
		var href = link.getAttribute("href");
		var title = getTiddlerFromHref(href);
		
		if (!title || shouldExclude(title)) return;
		
		// Get position
		var rect = link.getBoundingClientRect();
		var x = rect.left;
		var y = rect.bottom + 5;
		
		// Show preview after a short delay
		hoverTimeout = setTimeout(function() {
			showPreview(title, x, y);
		}, 150);
		
	}, true);
	
	// Handle mouseout from links
	document.addEventListener("mouseout", function(event) {
		var target = event.target;
		var relatedTarget = event.relatedTarget;
		
		// Check if we're leaving a link
		var link = target.closest ? target.closest(".tc-tiddlylink") : null;
		if (!link && target.classList && target.classList.contains("tc-tiddlylink")) {
			link = target;
		}
		
		if (!link) return;
		
		// Check if we're entering the preview popup
		var popup = relatedTarget ? (relatedTarget.closest ? relatedTarget.closest(".tc-preview-popup") : null) : null;
		if (popup) return; // Don't hide if moving to popup
		
		// Clear pending show
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		
		// Hide with a small delay (allows moving to popup)
		hoverTimeout = setTimeout(function() {
			hidePreview();
		}, 100);
		
	}, true);
	
	// Handle mouseout from popup
	document.addEventListener("mouseleave", function(event) {
		var target = event.target;
		
		// Check if we're leaving the popup
		if (!target.classList || !target.classList.contains("tc-preview-popup")) return;
		
		var relatedTarget = event.relatedTarget;
		
		// Check if we're going back to a link
		var link = relatedTarget ? (relatedTarget.closest ? relatedTarget.closest(".tc-tiddlylink") : null) : null;
		if (link) {
			// Check if it's the same tiddler
			var href = link.getAttribute("href");
			var title = getTiddlerFromHref(href);
			if (title === currentPreviewTiddler) return;
		}
		
		hidePreview();
		
	}, true);
};
