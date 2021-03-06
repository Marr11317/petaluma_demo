// ==UserScript==
// @name        Font Preview
// @version     1.0.22
// @description Font preview
// @license     MIT
// @author      Remi Marche
// @namespace   https://github.com/Marr11317
// @include     https://github.com/*
// @run-at      document-idle
// @require     https://greasyfork.org/scripts/28721-mutations/code/mutations.js?version=666427

/* global opentype */
(() => {
	"use strict";

	let font;
	let showUnicode = false;
	let showPoints = false;
	let showMinMax = false;
	let showArrows = false;
	let currentIndex = 0;

	// canvas colors
	const glyphFillColor = "#808080"; // (big) (mini) fill color
	const bigGlyphStrokeColor = "#111111"; // (big) stroke color
	const bigGlyphMarkerColor = "#f00"; // (big) min & max width marker
	const miniGlyphMarkerColor = "#606060"; // (mini) glyph index (bottom left corner)
	const glyphRulerColor = "#a0a0a0"; // (mini) min & max width marker & (big) glyph horizontal lines

	function getFont() {
		const block = document.getElementById("ghfp-body");
		const el = $(".final-path");

		opentype.load('src/Petaluma.otf', function(err, f) {
			if (err) {
				block.innerHTML = "<h2 class='gfp-message cdel'></h2>";
				showErrorMessage(err.toString());
				if (err.stack) {
					console.error(err.stack);
				}
				throw (err);
			} else {
				font = f;
				console.log("loading font")
				addHTML(block, el);
				showErrorMessage("");
				onFontLoaded(font);
			}
		});

		// add loading indicator
		console.log("request sent");
		// let request = new XMLHttpRequest();
		// request.open("GET", "https://github.com/steinbergmedia/petaluma/blob/master/redist/otf/PetalumaText.otf?raw=true");
		// request.responseType = "arraybuffer";
		// request.onload = setupFont;
		// request.send();
	}

	function addHTML(block, el) {
		let name = el.textContent || "";
		block.innerHTML = `
			<div id="gfp-wrapper">
				<span class="gfp-info" id="gfp-font-name">${name}</span>
				<h2 class="gfp-message cdel"></h2>
				<hr>
				<div id="gfp-font-data">
					<div class="gfp-collapsed">Table d'en-tête de la police <a href="https://www.microsoft.com/typography/OTSPEC/head.htm" target="_blank">head</a></div>
					<dl id="gfp-head-table"><dt>Non-défini</dt></dl>
					<div class="gfp-collapsed">Table d'en-tête horizontale <a href="https://www.microsoft.com/typography/OTSPEC/hhea.htm" target="_blank">hhea</a></div>
					<dl id="gfp-hhea-table"><dt>Non-défini</dt></dl>
					<div class="gfp-collapsed">Table de profile maximum <a href="https://www.microsoft.com/typography/OTSPEC/maxp.htm" target="_blank">maxp</a></div>
					<dl id="gfp-maxp-table"><dt>Non-défini</dt></dl>
					<div class="gfp-collapsed">Table de noms <a href="https://www.microsoft.com/typography/OTSPEC/name.htm" target="_blank">name</a></div>
					<dl id="gfp-name-table"><dt>Non-défini</dt></dl>
					<div class="gfp-collapsed">Table de données métriques OS/2 et Windows <a href="https://www.microsoft.com/typography/OTSPEC/os2.htm" target="_blank">OS/2</a></div>
					<dl id="gfp-os2-table"><dt>Non-défini</dt></dl>
					<div class="gfp-collapsed">Table PostScript <a href="https://www.microsoft.com/typography/OTSPEC/post.htm" target="_blank">post</a></div>
					<dl id="gfp-post-table"><dt>Non-défini</dt></dl>
					<div class="gfp-collapsed">Table de conversion charactère-index <a href="https://www.microsoft.com/typography/OTSPEC/cmap.htm" target="_blank">cmap</a></div>
					<dl id="gfp-cmap-table"><dt>Non-défini</dt></dl>
					<div class="gfp-collapsed">Table de variance <a href="https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6fvar.html" target="_blank">fvar</a></div>
					<dl id="gfp-fvar-table"><dt>Non-défini</dt></dl>
				</div>
				<hr>
				<div>
					<div>Format unicode: <input class="gfp-show-unicode" type="checkbox"${showUnicode ? " checked" : ""}></div>
					Charactères <span id="gfp-pagination"></span>
					<br>
					<div id="gfp-glyph-list-end"></div>
				</div>
				<div style="position: relative">
					<div id="gfp-glyph-display">
						<canvas id="gfp-glyph-bg" class="ghd-invert" width="500" height="500"></canvas>
						<canvas id="gfp-glyph" class="ghd-invert" width="500" height="500"></canvas>
					</div>
					<div id="gfp-glyph-data"></div>
					<div style="clear: both"></div>
				</div>
			</div>
		`;
		prepareGlyphList();
		// Add bindings for collapsible font data
		let tableHeaders = document.getElementById("gfp-font-data").getElementsByTagName("div"),
			indx = tableHeaders.length;
		while (indx--) {
			tableHeaders[indx].addEventListener("click", event => {
				event.target && event.target.classList.toggle("gfp-collapsed");
			}, false);
		}
		addBindings();
	}

	function addBindings() {
		$(".gfp-show-unicode").addEventListener("change", function() {
			showUnicode = this.checked;
			displayGlyphPage(pageSelected);
			return false;
		}, false);

		$("#gfp-glyph-data").addEventListener("change", function() {
			showPoints = $(".gfp-show-points", this).checked;
			showArrows = $(".gfp-show-arrows", this).checked;
			showMinMax = $(".gfp-show-min-max", this).checked;
			cellSelect();
			return false;
		}, false);
	}

	function $(selector, el) {
		return (el || document).querySelector(selector);
	}

	function init() {
		// get file name from bread crumb
		let el = $(".final-path");
		// font extension supported?
		if (el) {
			getFont();
		}
		else {
			console.log(".final-path not found");
		}
	}

	document.addEventListener("ghmo:container", init);
	init();

/*eslint-disable */
	/* Code copied from http://opentype.js.org/font-inspector.html */
	function escapeHtml(unsafe) {
		return unsafe
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\u0022/g, '&quot;')
			.replace(/\u0027/g, '&#039;');
	}

	function displayNames(names) {
		let indx, property, translations, langs, lang, langIndx, langLen, esclang,
			html = '',
			properties = Object.keys(names),
			len = properties.length;
		for (indx = 0; indx < len; indx++) {
			property = properties[indx];
			html += '<dt>' + escapeHtml(property) + '</dt><dd>';
			translations = names[property];
			langs = Object.keys(translations);
			langLen = langs.length;
			for (langIndx = 0; langIndx < langLen; langIndx++) {
				lang = langs[langIndx];
				esclang = escapeHtml(lang);
				html += '<span class="gfp-langtag">' + esclang +
					'</span> <span class="gfp-langname" lang=' + esclang + '>' +
					escapeHtml(translations[lang]) + '</span> ';
			}
			html += '</dd>';
		}
		document.getElementById('gfp-name-table').innerHTML = html;
	}

	function displayFontData() {
		let html, tablename, table, property, value, element;
		for (tablename in font.tables) {
			if (font.tables.hasOwnProperty(tablename)) {
				table = font.tables[tablename];
				if (tablename === 'name') {
					displayNames(table);
					continue;
				}
				html = '';
				for (property in table) {
					if (table.hasOwnProperty(property)) {
						value = table[property];
						html += '<dt>' + property + '</dt><dd>';
						if (Array.isArray(value) && typeof value[0] === 'object') {
							html += value.map(item => {
								return JSON.stringify(item);
							}).join('<br>');
						} else if (typeof value === 'object') {
							html += JSON.stringify(value);
						} else {
							html += value;
						}
						html += '</dd>';
					}
				}
				element = document.getElementById('gfp-' + tablename + '-table');
				if (element) {
					element.innerHTML = html;
				}
			}
		}
	}

	/* Code copied from http://opentype.js.org/glyph-inspector.html */
	const cellCount = 40,
		cellWidth = 100,
		cellHeight = 100,
		cellMarginTop = 1,
		cellMarginBottom = 1,
		cellMarginLeftRight = 1,
		glyphMargin = 1,
		pixelRatio = window.devicePixelRatio || 1,
		arrowLength = 10,
		arrowAperture = 4;

	let pageSelected, fontScale, fontSize, fontBaseline, glyphScale, glyphSize, glyphBaseline;

	function enableHighDPICanvas(canvas) {
		let pixelRatio, oldWidth, oldHeight;
		if (typeof canvas === 'string') {
			canvas = document.getElementById(canvas);
		}
		pixelRatio = window.devicePixelRatio || 1;
		if (pixelRatio === 1) {
			return;
		}
		oldWidth = canvas.width;
		oldHeight = canvas.height;
		canvas.width = oldWidth * pixelRatio;
		canvas.height = oldHeight * pixelRatio;
		canvas.style.width = oldWidth + 'px';
		canvas.style.height = oldHeight + 'px';
		canvas.getContext('2d').scale(pixelRatio, pixelRatio);
	}

	function showErrorMessage(message) {
		let el = $('.gfp-message');
		el.style.display = (!message || message.trim().length === 0) ? 'none' : 'block';
		el.innerHTML = message;
	}

	function pathCommandToString(cmd) {
		let str = '<strong>' + cmd.type + '</strong> ' +
			((cmd.x !== undefined) ? 'x=' + cmd.x + ' y=' + cmd.y + ' ' : '') +
			((cmd.x1 !== undefined) ? 'x1=' + cmd.x1 + ' y1=' + cmd.y1 + ' ' : '') +
			((cmd.x2 !== undefined) ? 'x2=' + cmd.x2 + ' y2=' + cmd.y2 : '');
		return str;
	}

	function contourToString(contour) {
		return '<pre class="gfp-contour">' + contour.map(point => {
			// ".text-blue" class modified by GitHub Dark style
			// ".cdel" class modified by GitHub Dark style - more readable red
			return '<span class="gfp-' + (point.onCurve ? 'oncurve text-blue' : 'offcurve cdel') +
				'">x=' + point.x + ' y=' + point.y + '</span>';
		}).join('\n') + '</pre>';
	}

	function formatUnicode(unicode) {
		unicode = unicode.toString(16);
		if (unicode.length > 4) {
			return ('000000' + unicode.toUpperCase()).substr(-6);
		} else {
			return ('0000' + unicode.toUpperCase()).substr(-4);
		}
	}

	function displayGlyphData(glyphIndex) {
		let glyph, contours, html,
			container = document.getElementById('gfp-glyph-data'),
			addItem = name => {
				return glyph[name] ? `<dt>${name}</dt><dd>${glyph[name]}</dd>` : '';
			};
		if (glyphIndex < 0) {
			container.innerHTML = '';
			return;
		}
		glyph = font.glyphs.get(glyphIndex);
		html = `<dl>
			<dt>Points bezier</dt>
			<dd><input class="gfp-show-points" type="checkbox"${showPoints ? ' checked' : ''}></dd>
			<dt>Extremums</dt>
			<dd><input class="gfp-show-min-max" type="checkbox"${showMinMax ? ' checked' : ''}></dd>
			<dt>Flèches directionnelles</dt>
			<dd><input class="gfp-show-arrows" type="checkbox"${showArrows ? ' checked' : ''}></dd>
			<dt>Nom</dt><dd>${glyph.name}</dd>`;

		if (glyph.unicode) {
			html += '<dt>Valeur Unicode</dt><dd>' + glyph.unicodes.map(formatUnicode).join(', ') + '</dd>';
		}
		html += addItem('index') +
			addItem('X Minimum') +
			addItem('X Maximum') +
			addItem('Y minimum') +
			addItem('Y Maximum') +
			addItem('Avance') +
			addItem('Échappée gauche') +
			'</dl>';

		if (glyph.numberOfContours > 0) {
			contours = glyph.getContours();
			html += 'contours:<br>' + contours.map(contourToString).join('\n');
		} else if (glyph.isComposite) {
			html += '<br>Ce caractère composé est composé de <ul><li>' +
				glyph.components.map(component => {
					return 'caractère ' + component.glyphIndex + ' à dx=' + component.dx +
						', dy=' + component.dy;
				}).join('</li><li>') + '</li></ul>';
		} else if (glyph.path) {
			html += 'Chemin de traçage:<br><pre class="gfp-path">  ' +
				glyph.path.commands.map(pathCommandToString).join('\n  ') + '\n</pre>';
		}
		container.innerHTML = html;
	}

	function drawArrow(ctx, x1, y1, x2, y2) {
		let dx = x2 - x1,
			dy = y2 - y1,
			segmentLength = Math.sqrt(dx * dx + dy * dy),
			unitx = dx / segmentLength,
			unity = dy / segmentLength,
			basex = x2 - arrowLength * unitx,
			basey = y2 - arrowLength * unity,
			normalx = arrowAperture * unity,
			normaly = -arrowAperture * unitx;
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(basex + normalx, basey + normaly);
		ctx.lineTo(basex - normalx, basey - normaly);
		ctx.lineTo(x2, y2);
		ctx.closePath();
		ctx.fill();
	}

	/**
	 * This function is Path.prototype.draw with an arrow
	 * at the end of each contour.
	 */
	function drawPathWithArrows(ctx, path) {
		let indx, cmd, x1, y1, x2, y2,
			arrows = [],
			len = path.commands.length;
		ctx.beginPath();
		for (indx = 0; indx < len; indx++) {
			cmd = path.commands[indx];
			if (cmd.type === 'M') {
				if (x1 !== undefined) {
					arrows.push([ctx, x1, y1, x2, y2]);
				}
				ctx.moveTo(cmd.x, cmd.y);
			} else if (cmd.type === 'L') {
				ctx.lineTo(cmd.x, cmd.y);
				x1 = x2;
				y1 = y2;
			} else if (cmd.type === 'C') {
				ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
				x1 = cmd.x2;
				y1 = cmd.y2;
			} else if (cmd.type === 'Q') {
				ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
				x1 = cmd.x1;
				y1 = cmd.y1;
			} else if (cmd.type === 'Z') {
				arrows.push([ctx, x1, y1, x2, y2]);
				ctx.closePath();
			}
			x2 = cmd.x;
			y2 = cmd.y;
		}
		if (path.fill) {
			ctx.fillStyle = path.fill;
			ctx.fill();
		}
		if (path.stroke) {
			ctx.strokeStyle = path.stroke;
			ctx.lineWidth = path.strokeWidth;
			ctx.stroke();
		}
		ctx.fillStyle = bigGlyphStrokeColor;
		if (showArrows) {
			arrows.forEach(arrow => {
				drawArrow.apply(null, arrow);
			});
		}
	}

	function displayGlyph(glyphIndex) {
		let glyph, glyphWidth, xmin, xmax, x0, markSize, path,
			canvas = document.getElementById('gfp-glyph'),
			ctx = canvas.getContext('2d'),
			width = canvas.width / pixelRatio,
			height = canvas.height / pixelRatio;
		ctx.clearRect(0, 0, width, height);
		if (glyphIndex < 0) {
			return;
		}
		glyph = font.glyphs.get(glyphIndex);
		glyphWidth = glyph.advanceWidth * glyphScale;
		xmin = (width - glyphWidth) / 2;
		xmax = (width + glyphWidth) / 2;
		x0 = xmin;
		markSize = 10;

		ctx.fillStyle = bigGlyphMarkerColor;
		if (showMinMax) {
			ctx.fillRect(xmin - markSize + 1, glyphBaseline, markSize, 1);
			ctx.fillRect(xmin, glyphBaseline, 1, markSize);
			ctx.fillRect(xmax, glyphBaseline, markSize, 1);
			ctx.fillRect(xmax, glyphBaseline, 1, markSize);
			ctx.textAlign = 'center';
			ctx.fillText('0', xmin, glyphBaseline + markSize + 10);
			ctx.fillText(glyph.advanceWidth, xmax, glyphBaseline + markSize + 10);
		}

		ctx.fillStyle = bigGlyphStrokeColor;
		path = glyph.getPath(x0, glyphBaseline, glyphSize);
		path.fill = glyphFillColor;
		path.stroke = bigGlyphStrokeColor;
		path.strokeWidth = 1.5;
		drawPathWithArrows(ctx, path);
		if (showPoints) {
			glyph.drawPoints(ctx, x0, glyphBaseline, glyphSize);
		}
	}

	function renderGlyphItem(canvas, glyphIndex) {
		const cellMarkSize = 4,
			ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, cellWidth, cellHeight);
		if (glyphIndex >= font.numGlyphs) {
			return;
		}

		ctx.fillStyle = miniGlyphMarkerColor;
		ctx.font = '10px sans-serif';
		let glyph = font.glyphs.get(glyphIndex),
			glyphWidth = glyph.advanceWidth * fontScale,
			xmin = (cellWidth - glyphWidth) / 2,
			xmax = (cellWidth + glyphWidth) / 2,
			x0 = xmin;

		ctx.fillText(showUnicode ? glyph.unicodes.map(formatUnicode).join(', ') : glyphIndex, 1, cellHeight - 1);

		ctx.fillStyle = glyphRulerColor;
		ctx.fillRect(xmin - cellMarkSize + 1, fontBaseline, cellMarkSize, 1);
		ctx.fillRect(xmin, fontBaseline, 1, cellMarkSize);
		ctx.fillRect(xmax, fontBaseline, cellMarkSize, 1);
		ctx.fillRect(xmax, fontBaseline, 1, cellMarkSize);

		ctx.fillStyle = '#000000';
		let path = glyph.getPath(x0, fontBaseline, fontSize);
		path.fill = glyphFillColor;
		path.draw(ctx);
	}

	function displayGlyphPage(pageNum) {
		pageSelected = pageNum;
		document.getElementById('gfp-p' + pageNum).className = 'gfp-page-selected';
		let indx,
			firstGlyph = pageNum * cellCount;
		for (indx = 0; indx < cellCount; indx++) {
			renderGlyphItem(document.getElementById('gfp-g' + indx), firstGlyph + indx);
		}
	}

	function pageSelect(event) {
		document.getElementsByClassName('gfp-page-selected')[0].className = 'text-blue';
		displayGlyphPage((event.target.id || '').replace('gfp-p', ''));
	}

	function initGlyphDisplay() {
		let glyphBgCanvas = document.getElementById('gfp-glyph-bg'),
			w = glyphBgCanvas.width / pixelRatio,
			h = glyphBgCanvas.height / pixelRatio,
			glyphW = w - glyphMargin * 2,
			glyphH = h - glyphMargin * 2,
			head = font.tables.head,
			maxHeight = head.yMax - head.yMin,
			ctx = glyphBgCanvas.getContext('2d');

		glyphScale = Math.min(glyphW / (head.xMax - head.xMin), glyphH / maxHeight);
		glyphSize = glyphScale * font.unitsPerEm;
		glyphBaseline = glyphMargin + glyphH * head.yMax / maxHeight;

		function hline(text, yunits) {
			let ypx = glyphBaseline - yunits * glyphScale;
			ctx.fillText(text, 2, ypx + 3);
			ctx.fillRect(80, ypx, w, 1);
		}

		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = glyphRulerColor;
		hline('Baseline', 0);
		hline('yMax', font.tables.head.yMax);
		hline('yMin', font.tables.head.yMin);
		hline('Ascender', font.tables.hhea.ascender);
		hline('Descender', font.tables.hhea.descender);
		hline('Typo Ascender', font.tables.os2.sTypoAscender);
		hline('Typo Descender', font.tables.os2.sTypoDescender);
	}

	function onFontLoaded(font) {
		let indx, link, lastIndex,
			w = cellWidth - cellMarginLeftRight * 2,
			h = cellHeight - cellMarginTop - cellMarginBottom,
			head = font.tables.head,
			maxHeight = head.yMax - head.yMin,
			pagination = document.getElementById('gfp-pagination'),
			fragment = document.createDocumentFragment(),
			numPages = Math.ceil(font.numGlyphs / cellCount);

		fontScale = Math.min(w / (head.xMax - head.xMin), h / maxHeight);
		fontSize = fontScale * font.unitsPerEm;
		fontBaseline = cellMarginTop + h * head.yMax / maxHeight;
		pagination.innerHTML = '';

		for (indx = 0; indx < numPages; indx++) {
			link = document.createElement('span');
			lastIndex = Math.min(font.numGlyphs - 1, (indx + 1) * cellCount - 1);
			link.textContent = indx * cellCount + '-' + lastIndex;
			link.id = 'gfp-p' + indx;
			link.className = 'text-blue';
			link.addEventListener('click', pageSelect, false);
			fragment.appendChild(link);
			// A white space allows to break very long lines into multiple lines.
			// This is needed for fonts with thousands of glyphs.
			fragment.appendChild(document.createTextNode(' '));
		}
		pagination.appendChild(fragment);

		displayFontData();
		initGlyphDisplay();
		displayGlyphPage(0);
		displayGlyph(-1);
		displayGlyphData(-1);
	}

	function cellSelect(event) {
		if (!font) {
			return;
		}
		let firstGlyphIndex = pageSelected * cellCount,
			cellIndex = event ? +event.target.id.replace('gfp-g', '') : currentIndex,
			glyphIndex = firstGlyphIndex + cellIndex;
		currentIndex = cellIndex;
		if (glyphIndex < font.numGlyphs) {
			displayGlyph(glyphIndex);
			displayGlyphData(glyphIndex);
		}
	}

	function prepareGlyphList() {
		let indx, canvas,
			marker = document.getElementById('gfp-glyph-list-end'),
			parent = marker.parentElement;
		for (indx = 0; indx < cellCount; indx++) {
			canvas = document.createElement('canvas');
			canvas.width = cellWidth;
			canvas.height = cellHeight;
			canvas.className = 'gfp-item ghd-invert';
			canvas.id = 'gfp-g' + indx;
			canvas.addEventListener('click', cellSelect, false);
			enableHighDPICanvas(canvas);
			parent.insertBefore(canvas, marker);
		}
	}
	/* eslint-enable */

})();
