const { substr_count, strtolower, strtoupper, str_replace, strlen, is_string, isset, in_array, strpos, substr, method_exists,
    chr, function_exists, count, ord, sprintf, is_array, gzcompress,gzuncompress } = require('./PHP_CoreFunctions')
const fs = require('fs')
const LoadJpeg = require('./ImageManager/Jpeg');

const { Readable } = require('stream');

module.exports = class FPDF {

    constructor(orientation = 'P', unit = 'mm', size = 'A4') {

        // Initialization of properties
        this.FPDF_VERSION = '1.82'
        this.AliasNbPages = ''
        this.state = 0;
        this.page = 0;
        this.n = 2;
        this.buffer = new Readable({read() {} });
        this.pages = {};
        this.PageInfo = new Array();
        this.fonts = {};
        this.FontFiles = {};
        this.encodings = [];
        this.cmaps = [];
        this.images = {};
        this.links = [];
        this.InHeader = false;
        this.InFooter = false;
        this.lasth = 0;
        this.FontFamily = '';
        this.FontStyle = '';
        this.FontSizePt = 12;
        this.underline = false;
        this.DrawColor = '0 G';
        this.FillColor = '0 g';
        this.TextColor = '0 g';
        this.ColorFlag = false;
        this.WithAlpha = false;
        this.ws = 0;
        this.AutoPageBreak = true
        this.offset =0
        //fixes php to javascript
        this.offsets = {}
        this.PageLinks = {}
        this.metadata = {}
        //end fixes
        
        // Font path
        this.fontpath = `${__dirname}/fonts/`
        // Core fonts
        this.CoreFonts = ['courier', 'helvetica', 'times', 'symbol', 'zapfdingbats']
        // Scale factor
        if (unit === 'pt') {
            this.k = 1;
        } else if (unit === 'mm') {
            this.k = 72 / 25.4;
        } else if (unit === 'cm') {
            this.k = 72 / 2.54;
        } else if (unit === 'in') {
            this.k = 72;
        } else {
            this.Error(`Incorrect unit: ${unit}`);
        }
        // Page sizes
        this.StdPageSizes = { 'a3': [841.89, 1190.55], 'a4': [595.28, 841.89], 'a5': [420.94, 595.28], 'letter': [612, 792], 'legal': [612, 1008] };
        size = this._getpagesize(size);
        this.DefPageSize = size;
        this.CurPageSize = size;
        // Page orientation
        orientation = strtolower(orientation);
        if (orientation === 'p' || orientation === 'portrait') {
            this.DefOrientation = 'P';
            this.w = size[0];
            this.h = size[1];
        } else if (orientation === 'l' || orientation === 'landscape') {
            this.DefOrientation = 'L';
            this.w = size[1];
            this.h = size[0];
        } else {
            this.Error(`Incorrect orientation: ${orientation}`);
        }

        this.CurOrientation = this.DefOrientation;
        this.wPt = this.w * this.k;
        this.hPt = this.h * this.k;
        // Page rotation
        this.CurRotation = 0;
        // Page margins (1 cm)
        let margin = 28.35 / this.k;
        this.SetMargins(margin, margin);
        // Interior cell margin (1 mm)
        this.cMargin = margin / 10;
        // Line width (0.2 mm)
        this.LineWidth = .567 / this.k;
        // Automatic page break
        this.SetAutoPageBreak(true, 2 * margin);
        // Default display mode
        this.SetDisplayMode('default');
        // Enable compression
        this.SetCompression(true);
        // Set default PDF version number
        this.PDFVersion = '1.3';

    }

    SetMargins(left, top, right = null) {
        // Set left, top and right margins
        this.lMargin = left;
        this.tMargin = top;

        if (right === null) {
            right = left;
        }

        this.rMargin = right;

    }

    SetLeftMargin(margin) {
        // Set left margin
        this.lMargin = margin;
        if (this.page > 0 && $this.x < margin) {
            this.x = margin;
        }

    }

    SetTopMargin(margin) {
        // Set top margin
        this.tMargin = margin;
    }

    SetRightMargin(margin) {
        // Set right margin
        this.rMargin = margin;
    }

    SetAutoPageBreak(auto, margin = 0) {
        // Set auto page break mode and triggering margin
        this.AutoPageBreak = auto;
        this.bMargin = margin;
        this.PageBreakTrigger = this.h - margin;
    }

    SetDisplayMode(zoom, layout = 'default') {
        // Set display mode in viewer
        if (zoom === 'fullpage' || zoom === 'fullwidth' || zoom === 'real' || zoom === 'default' || !is_string(zoom)) {
            this.ZoomMode = zoom;
        } else {
            this.Error(`Incorrect zoom display mode: ${zoom}`);
        }

        if (layout === 'single' || layout === 'continuous' || layout === 'two' || layout === 'default') {
            this.LayoutMode = layout;
        } else {
            this.Error(`Incorrect layout display mode: ${layout}`);
        }

    }

    SetCompression(compress) {
        // Set page compression
        if (function_exists('zlib')) {
            this.compress = compress;
        } else {
            this.compress = false;
        }

    }

    SetTitle(title, isUTF8 = false) {
        // Title of document
        this.metadata['Title'] = title//isUTF8 ? title : utf8_encode(title);
    }

    SetAuthor(author, isUTF8 = false) {
        // Author of document
        this.metadata['Author'] = author//isUTF8 ? author : utf8_encode(author);
    }

    SetSubject(subject, isUTF8 = false) {
        // Subject of document
        this.metadata['Subject'] =subject //isUTF8 ? subject : utf8_encode(subject);
    }

    SetKeywords(keywords, isUTF8 = false) {
        // Keywords of document
        this.metadata['Keywords'] =keywords //isUTF8 ? keywords : utf8_encode(keywords);
    }

    SetCreator(creator, isUTF8 = false) {
        // Creator of document
        this.metadata['Creator'] =creator //isUTF8 ? creator : utf8_encode(creator);
    }

    AliasNbPages(alias = '{nb}') {
        // Define an alias for total number of pages
        this.AliasNbPages = alias;
    }

    Close() {
        // Terminate document
        if (this.state === 3) {
            return;
        }

        if (this.page === 0) {
            this.AddPage();
        }

        // Page footer
        this.InFooter = true;
        this.Footer();
        this.InFooter = false;
        // Close page
        this._endpage();
        // Close document
        this._enddoc();
    }

    AddPage(orientation = '', size = '', rotation = 0) {

        // Start a new page
        if (this.state === 3) {
            this.Error('The document is closed');
        }

        let family = this.FontFamily;
        let style = this.FontStyle + (this.underline ? 'U' : '');
        let fontsize = this.FontSizePt;
        let lw = this.LineWidth;
        let dc = this.DrawColor;
        let fc = this.FillColor;
        let tc = this.TextColor;
        let cf = this.ColorFlag;

        if (this.page > 0) {
            // Page footer
            this.InFooter = true;
            this.Footer();
            this.InFooter = false;
            // Close page
            this._endpage();
        }

        // Start new page
        this._beginpage(orientation, size, rotation);
        // Set line cap style to square
        this._out('2 J');
        // Set line width
        this.LineWidth = lw;
        this._out(sprintf('%.2f w', lw * this.k));
        // Set font
        if (family) {
            this.SetFont(family, style, fontsize);
        }
        // Set colors
        this.DrawColor = dc;
        if (dc !== '0 G') {
            this._out(dc);
        }
        this.FillColor = fc;
        if (fc !== '0 g') {
            this._out(fc);
        }
        this.TextColor = tc;
        this.ColorFlag = cf;

        // Page header
        this.InHeader = true;
        this.Header();
        this.InHeader = false;
        // Restore line width
        if (this.LineWidth !== lw) {
            this.LineWidth = lw;
            this._out(sprintf('%.2f w', lw * this.k));
        }
        // Restore font
        if (family) {
            this.SetFont(family, style, fontsize);
        }
        // Restore colors
        if (this.DrawColor !== dc) {
            this.DrawColor = dc;
            this._out(dc);
        }
        if (this.FillColor !== fc) {
            this.FillColor = fc;
            this._out(fc);
        }
        this.TextColor = tc;
        this.ColorFlag = cf;
    }

    Header() { /* To be implemented in your own inherited class*/ }

    Footer() { /* To be implemented in your own inherited class*/ }

    PageNo() {
        // Get current page number
        return this.page;
    }

    SetDrawColor(r, g = null, b = null) {
        // Set color for all stroking operations
        if ((r === 0 && g === 0 && b === 0) || g === null) {
            this.DrawColor = sprintf('%.3f g', r / 255);
        } else {
            this.DrawColor = sprintf('%.3f %.3f %.3f rg', r / 255, g / 255, b / 255);
        }

        if (this.page > 0) {
            this._out(this.DrawColor);
        }

    }

    SetFillColor(r, g = null, b = null) {
        // Set color for all filling operations
        if ((r == 0 && g == 0 && b == 0) || g === null) {
            this.FillColor = sprintf('%.3f g', r / 255);
        } else {
            this.FillColor = sprintf('%.3f %.3f %.3f rg', r / 255, g / 255, b / 255);
        }

        this.ColorFlag = (this.FillColor !== this.TextColor);
        if (this.page > 0) {
            this._out(this.FillColor);
        }

    }

    SetTextColor(r, g = null, b = null) {
        // Set color for text
        if ((r == 0 && g == 0 && b == 0) || g === null) {
            this.TextColor = sprintf('%.3f g', r / 255);
        } else {
            this.TextColor = sprintf('%.3f %.3f %.3f rg', r / 255, g / 255, b / 255);
        }

        this.ColorFlag = (this.FillColor !== this.TextColor);
    }

    GetStringWidth(s) {

        // Get width of a string in the current font
        s = `${s}`;
        let cw = this.CurrentFont['cw'];
        let w = 0;
        let l = strlen(s);

        for (let i = 0; i < l; i++) {
            w += cw[s.charAt(i)];
        }

        return w * this.FontSize / 1000;

    }

    SetLineWidth(width) {
        // Set line width
        this.LineWidth = width;
        if (this.page > 0) {
            this._out(sprintf('%.2f w', width * this.k));
        }

    }

    Line(x1, y1, x2, y2) {
        // Draw a line
        this._out(sprintf('%.2f %.2f m %.2f %.2f l S', x1 * this.k, (this.h - y1) * this.k, x2 * this.k, (this.h - y2) * this.k));
    }

    Rect(x, y, w, h, style = '') {
        let op
        // Draw a rectangle
        if (style === 'F')
            op = 'f';
        else if (style === 'FD' || style === 'DF')
            op = 'B';
        else
            op = 'S';

        this._out(sprintf('%.2f %.2f %.2f %.2f re %s', x * this.k, (this.h - y) * this.k, w * this.k, -h * this.k, op));
    }

    AddFont(family, style = '', file = '') {
        // Add a TrueType, OpenType or Type1 font
        family = strtolower(family);
        if (file === '') {
            file = str_replace(' ', '', family) + strtolower(style) + '.js';
        }

        style = strtoupper(style);
        if (style === 'IB') {
            style = 'BI';
        }

        let fontkey = family + style;
        if (isset(this.fonts[fontkey])) {
            return;
        }

        const info = this._loadfont(file);
        info['i'] = count(this.fonts) + 1;

        if (info['file']) {
            // Embedded font
            if (info['type'] === 'TrueType')
                this.FontFiles[info['file']] = { length1: info['originalsize'] }
            else
                this.FontFiles[info['file']] = { length1: info['size1'], length2: info['size2'] }

        }

        this.fonts[fontkey] = { ...info };
    }

    SetFont(family, style = '', size = 0) {
        // Select a font; size given in points
        if (family === '') {
            family = this.FontFamily;
        } else {
            family = strtolower(family);
        }

        style = strtoupper(style);
        if (strpos(style, 'U') !== -1) {
            this.underline = true;
            style = str_replace('U', '', style);
        } else {
            this.underline = false;
        }

        if (style === 'IB') {
            style = 'BI';
        }

        if (size === 0) {
            size = this.FontSizePt;
        }

        // Test if font is already selected
        if (this.FontFamily === family && this.FontStyle === style && this.FontSizePt === size) {
            return;
        }
        // Test if font is already loaded
        let fontkey = family + style;
        if (!isset(this.fonts[fontkey])) {
            // Test if one of the core fonts
            if (family === 'arial') {
                family = 'helvetica';
            }

            if (in_array(family, this.CoreFonts)) {
                if (family === 'symbol' || family === 'zapfdingbats') {
                    style = '';
                }

                fontkey = family + style;
                if (!isset(this.fonts[fontkey])) {
                    this.AddFont(family, style);
                }

            } else {
                this.Error(`Undefined font: ${family} ${style}`);
            }

        }
        // Select it
        this.FontFamily = family;
        this.FontStyle = style;
        this.FontSizePt = size;
        this.FontSize = size / this.k;
        this.CurrentFont = { ...this.fonts[fontkey] };

        if (this.page > 0) {
            this._out(sprintf('BT /F%d %.2f Tf ET', this.CurrentFont['i'], this.FontSizePt));
        }

    }

    SetFontSize(size) {
        // Set font size in points
        if (this.FontSizePt === size) {
            return;
        }

        this.FontSizePt = size;
        this.FontSize = size / this.k;

        if (this.page > 0) {
            this._out(sprintf('BT /F%d %.2f Tf ET', this.CurrentFont['i'], this.FontSizePt));
        }

    }

    AddLink() {
        // Create a new internal link
        const n = count(this.links) + 1;
        this.links[n] = [0, 0];
        return n;
    }

    SetLink(link, y = 0, page = -1) {
        // Set destination of internal link
        if (y === -1) {
            y = this.y;
        }

        if (page === -1) {
            page = this.page;
        }

        this.links[link] = [page, y];
    }

    Link(x, y, w, h, link) {
        // Put a link on the page
        this.PageLinks[this.page] = [x * this.k, this.hPt - y * this.k, w * this.k, h * this.k, link];
    }

    Text(x, y, txt) {
        // Output a string
        if (!isset(this.CurrentFont)) {
            this.Error('No font has been set');
        }

        let s = sprintf('BT %.2f %.2f Td (%s) Tj ET', x * this.k, (this.h - y) * this.k, this._escape(txt));
        if (this.underline && txt !== '') {
            s += ` ${this._dounderline(x, y, txt)}`;
        }

        if (this.ColorFlag) {
            s = `q ${this.TextColor} ${s} Q`;
        }

        this._out(s);
    }

    AcceptPageBreak() {
        // Accept automatic page break or not
        return this.AutoPageBreak;
    }

    Cell(w, h = 0, txt = '', border = 0, ln = 0, align = '', fill = false, link = '') {
        //fix type
        txt = `${txt}`
        // Output a cell
        let k = this.k;
        if (this.y + h > this.PageBreakTrigger && !this.InHeader && !this.InFooter && this.AcceptPageBreak()) {
            // Automatic page break
            let x = this.x;
            let ws = this.ws;
            if (ws > 0) {
                this.ws = 0;
                this._out('0 Tw');
            }

            this.AddPage(this.CurOrientation, this.CurPageSize, this.CurRotation);
            this.x = x;
            if (ws > 0) {
                this.ws = ws;
                this._out(sprintf('%.3f Tw', ws * k));
            }

        }

        if (w == 0) {
            w = this.w - this.rMargin - this.x;
        }

        let s = '';
        if (fill || border === 1) {
            let op
            if (fill)
                op = (border == 1) ? 'B' : 'f';
            else
                op = 'S';

            s = sprintf('%.2f %.2f %.2f %.2f re %s ', this.x * k, (this.h - this.y) * k, w * k, -h * k, op);
        }

        if (is_string(border)) {
            let x = this.x;
            let y = this.y;

            if (strpos(border, 'L') !== -1)
                s += sprintf('%.2f %.2f m %.2f %.2f l S ', x * k, (this.h - y) * k, x * k, (this.h - (y + h)) * k);
            if (strpos(border, 'T') !== -1)
                s += sprintf('%.2f %.2f m %.2f %.2f l S ', x * k, (this.h - y) * k, (x + w) * k, (this.h - y) * k);
            if (strpos(border, 'R') !== -1)
                s += sprintf('%.2f %.2f m %.2f %.2f l S ', (x + w) * k, (this.h - y) * k, (x + w) * k, (this.h - (y + h)) * k);
            if (strpos(border, 'B') !== -1)
                s += sprintf('%.2f %.2f m %.2f %.2f l S ', x * k, (this.h - (y + h)) * k, (x + w) * k, (this.h - (y + h)) * k);
        }

        if (txt !== '') {
            if (!isset(this.CurrentFont)) {
                this.Error('No font has been set');
            }

            let dx
            if (align === 'R')
                dx = w - this.cMargin - this.GetStringWidth(txt);
            else if (align === 'C')
                dx = (w - this.GetStringWidth(txt)) / 2;
            else
                dx = this.cMargin;

            if (this.ColorFlag) {
                s += `q ${this.TextColor} `;
            }

            s += sprintf('BT %.2f %.2f Td (%s) Tj ET', (this.x + dx) * k, (this.h - (this.y + .5 * h + .3 * this.FontSize)) * k, this._escape(txt));

            if (this.underline) {
                s += ` ${this._dounderline(this.x + dx, this.y + .5 * h + .3 * this.FontSize, txt)}`;
            }

            if (this.ColorFlag) {
                s += ' Q';
            }

            if (link) {
                this.Link(this.x + dx, this.y + .5 * h - .5 * this.FontSize, this.GetStringWidth(txt), this.FontSize, link);
            }

        }

        if (s) {
            this._out(s);
        }

        this.lasth = h;

        if (ln > 0) {
            // Go to next line
            this.y += h;
            if (ln == 1) {
                this.x = this.lMargin;
            }

        } else {
            this.x += w;
        }

    }

    MultiCell(w, h, txt, border = 0, align = 'J', fill = false) {
        //fix type
        txt = `${txt}`
        // Output text with automatic or explicit line breaks
        if (!isset(this.CurrentFont)) {
            this.Error('No font has been set');
        }

        let cw = this.CurrentFont['cw'];
        if (w == 0) {
            w = this.w - this.rMargin - this.x;
        }

        let wmax = (w - 2 * this.cMargin) * 1000 / this.FontSize;
        let s = str_replace("\r", '', txt);
        let nb = strlen(s);

        if (nb > 0 && s.charAt(nb - 1) === "\n") {
            nb--;
        }

        let b = 0;
        let b2
        if (border) {
            if (border === 1) {
                border = 'LTRB';
                b = 'LRT';
                b2 = 'LR';
            } else {
                b2 = '';
                if (strpos(border, 'L') !== -1) {
                    b2 += 'L';
                }
                if (strpos(border, 'R') !== -1) {
                    b2 += 'R';
                }

                b = (strpos(border, 'T') !== -1) ? b2 + 'T' : b2;
            }
        }
        let sep = -1;
        let i = 0;
        let j = 0;
        let l = 0;
        let ns = 0;
        let nl = 1;

        while (i < nb) {
            // Get next character
            let c = s.charAt(i);

            if (c === "\n") {
                // Explicit line break
                if (this.ws > 0) {
                    this.ws = 0;
                    this._out('0 Tw');
                }

                this.Cell(w, h, substr(s, j, i - j), b, 2, align, fill);
                i++;
                sep = -1;
                j = $i;
                l = 0;
                ns = 0;
                nl++;
                if (border && nl === 2) {
                    b = b2;
                }

                continue;
            }

            if (c === ' ') {
                sep = i;
                ls = l;
                ns++;
            }

            l += cw[c];

            if (l > wmax) {
                // Automatic line break
                if (sep === -1) {
                    if (i === j) {
                        i++;
                    }

                    if (this.ws > 0) {
                        this.ws = 0;
                        this._out('0 Tw');
                    }

                    this.Cell(w, h, substr(s, j, i - j), b, 2, align, fill);

                } else {

                    if (align === 'J') {
                        this.ws = (ns > 1) ? (wmax - ls) / 1000 * this.FontSize / (ns - 1) : 0;
                        this._out(sprintf('%.3f Tw', this.ws * this.k));
                    }

                    this.Cell(w, h, substr(s, j, sep - j), b, 2, align, fill);
                    i = sep + 1;
                }

                sep = -1;
                j = i;
                l = 0;
                ns = 0;
                nl++;

                if (border && nl === 2) {
                    b = b2;
                }

            } else {
                i++;
            }

        }

        // Last chunk
        if (this.ws > 0) {
            this.ws = 0;
            this._out('0 Tw');
        }

        if (border && strpos(border, 'B') !== -1) {
            b += 'B';
        }

        this.Cell(w, h, substr(s, j, i - j), b, 2, align, fill);
        this.x = this.lMargin;
    }

    Write(h, txt, link = '') {
        // Output text in flowing mode
        if (!isset(this.CurrentFont)) {
            this.Error('No font has been set');
        }

        let cw = this.CurrentFont['cw'];
        //this.x = this.lMargin;
        let w = this.w - this.rMargin - this.x;
        let wmax = ((w - 2 * this.cMargin) * 1000 / this.FontSize);
        //console.log('wmax primer calculo',wmax)

        let s = str_replace("\r", '', txt);
        let nb = strlen(s);
        let sep = -1;
        let i = 0;
        let j = 0;
        let l = 0;
        let nl = 1;
        let c = '';

        while (i < nb) {
            // Get next character
            c = s.charAt(i);

            if (c === "\n") {
                // Explicit line break
                this.Cell(w, h, substr(s, j, i - j), 0, 2, '', false, link);
                i++;
                sep = -1;
                j = i;
                l = 0;

                if (nl === 1) {
                    this.x = this.lMargin;
                    w = this.w - this.rMargin - this.x;
                    wmax = (w - 2 * this.cMargin) * 1000 / this.FontSize;

                }

                nl++;
                continue;
            }

            if (c === ' ') {
                sep = i;
            }

            l += cw[c];

            if (l > wmax) {
                // Automatic line break
                if (sep === -1) {

                    if (this.x > this.lMargin) {
                        // Move to next line
                        this.x = this.lMargin;
                        this.y += h;
                        w = this.w - this.rMargin - this.x;
                        wmax = (w - 2 * this.cMargin) * 1000 / this.FontSize;
                        i++;
                        nl++;
                        continue;
                    }

                    if (i == j) {
                        i++;
                    }

                    this.Cell(w, h, substr(s, j, i - j), 0, 2, '', false, link);
                } else {
                    this.Cell(w, h, substr(s, j, sep - j), 0, 2, '', false, link);
                    i = sep + 1;
                }

                sep = -1;
                j = i;
                l = 0;
                if (nl === 1) {
                    this.x = this.lMargin;
                    w = this.w - this.rMargin - this.x;
                    wmax = (w - 2 * this.cMargin) * 1000 / this.FontSize;
                }
                nl++;

            } else {
                i++;
            }

        }
        // Last chunk
        if (i !== j) {
            this.Cell(l / 1000 * this.FontSize, h, substr(s, j), 0, 0, '', false, link);
        }

    }

    Ln(h = null) {
        // Line feed; default value is the last cell height
        this.x = this.lMargin;
        if (h === null)
            this.y += this.lasth;
        else
            this.y += h;

    }

    Image(file, x = null, y = null, w = 0, h = 0, type = '', link = '') {
        // Put an image on the page
        if (file === '') {
            this.Error('Image file name is empty');
        }

        let info
        if (!isset(this.images[file])) {
            // First use of this image, get info
            if (type === '') {

                let pos = strpos(file, '.');
                if (pos == -1) {
                    this.Error(`Image file has no extension and no type was specified: ${file}`);
                }
                type = substr(file, pos + 1);

            }

            type = strtolower(type);
            if (type === 'jpeg') {
                type = 'jpg';
            }

            let mtd = '_parse' + type;
            if (!method_exists(this, mtd)) {
                this.Error('Unsupported image type: ' + $type);
            }

            info = this[mtd](file);
            info['i'] = count(this.images) + 1;
         
            this.images[file] = {...info};

        } else {
            info = this.images[file];
        }

        // Automatic width and height calculation if needed
        if (w === 0 && h === 0) {
            // Put image at 96 dpi
            w = -96;
            h = -96;
        }

        if (w < 0){ w = -info['w'] * 72 / w / this.k; }   
        if (h < 0){ h = -info['h'] * 72 / h / this.k;}  
        if (w === 0){ w = h * info['w'] / info['h']; }   
        if (h === 0){ h = w * info['h'] / info['w'];}
            
        // Flowing mode
        if (y === null) {
            if (this.y + h > this.PageBreakTrigger && !this.InHeader && !this.InFooter && this.AcceptPageBreak()) {
                // Automatic page break
                let x2 = this.x;
                this.AddPage(this.CurOrientation, this.CurPageSize, this.CurRotation);
                this.x = x2;
            }
            y = this.y;
            this.y += h;
        }

        if (x === null) {
            x = this.x;
        }

        this._out(sprintf('q %.2f 0 0 %.2f %.2f %.2f cm /I%d Do Q', w * this.k, h * this.k, x * this.k, (this.h - (y + h)) * this.k, info['i']));
        if (link) {
            this.Link(x, y, w, h, link);
        }

    }

    GetPageWidth() {
        // Get current page width
        return this.w;
    }

    GetPageHeight() {
        // Get current page height
        return this.h;
    }

    GetX() {
        // Get x position
        return this.x;
    }

    SetX(x) {
        // Set x position
        if (x >= 0)
            this.x = x;
        else
            this.x = this.w + x;
    }

    GetY() {
        // Get y position
        return this.y;
    }

    SetY(y, resetX = true) {
        // Set y position and optionally reset x
        if (y >= 0)
            this.y = y;
        else
            this.y = this.h + y;

        if (resetX)
            this.x = this.lMargin;
    }

    SetXY(x, y) {
        // Set x and y positions
        this.SetX(x);
        this.SetY(y, false);
    }

    Output(dest = 'F', name = '', isUTF8 = false) {
        // Output PDF to some destination
        this.Close();
        if (strlen(name) == 1 && strlen(dest) != 1) {
            // Fix parameter order
            let tmp = dest;
            dest = name;
            name = tmp;
        }

        if (dest === '') {
            dest = 'I';
        }
        if (name == '') {
            name = 'doc.pdf';
        }

        switch (dest.toLowerCase()) {
            case 'f':
                this.buffer.pipe(fs.createWriteStream(name))
                break;
            case 's':
                return this.buffer;
                break;
            default:
                throw 'ERROR -- Unrecognized output type: "' + xdest + '", options are I (in browser), D (download through browser), F (write to file), or S (return as a string).'
        }

    }

    Error(msg) { throw 'FPDF error: ' + msg }

    /*******************************************************************************
    *                              Protected methods                               *
    *******************************************************************************/

    _dochecks() {}

    _checkoutput(){}

    _getpagesize(size) {
        if (is_string(size)) {
            size = strtolower(size);
            if (!isset(this.StdPageSizes[size])) {
                this.Error(`Unknown page size: ${size}`);
            }

            let a = this.StdPageSizes[size];
            return [a[0] / this.k, a[1] / this.k]

        } else {

            if (size[0] > size[1])
                return [size[1], size[0]];
            else
                return size;
        }
    }

    _beginpage(orientation, size, rotation) {
        this.page++;
        this.pages[this.page] = '';
        this.state = 2;
        this.x = this.lMargin;
        this.y = this.tMargin;
        this.FontFamily = '';

        // Check page size and orientation
        if (orientation === '')
            orientation = this.DefOrientation;
        else
            orientation = strtoupper(orientation);

        if (size === '')
            size = this.DefPageSize;
        else
            size = this._getpagesize(size);

        //fix page info to object
        if (typeof this.PageInfo[this.page] === 'undefined') {
            this.PageInfo[this.page] = {}
        }

        if (orientation !== this.CurOrientation || size[0] !== this.CurPageSize[0] || size[1] !== this.CurPageSize[1]) {
            // New size or orientation
            if (orientation === 'P') {
                this.w = size[0];
                this.h = size[1];
            } else {
                this.w = size[1];
                this.h = size[0];
            }

            this.wPt = this.w * this.k;
            this.hPt = this.h * this.k;
            this.PageBreakTrigger = this.h - this.bMargin;
            this.CurOrientation = orientation;
            this.CurPageSize = size;
        }

        if (orientation !== this.DefOrientation || size[0] !== this.DefPageSize[0] || size[1] !== this.DefPageSize[1]) {
            this.PageInfo[this.page]['size'] = [this.wPt, this.hPt];
        }

        if (rotation !== 0) {
            if (rotation % 90 !== 0) {
                this.Error(`Incorrect rotation value: ${rotation}`);
            }

            this.CurRotation = rotation;
            this.PageInfo[this.page]['rotation'] = rotation;
        }

    }

    _endpage() { this.state = 1; }

    _loadfont(font) {
        // Load a font definition file from the font directory
        if (strpos(font, '/') !== -1 || strpos(font, "\\") !== -1) {
            this.Error(`Incorrect font definition file name: ${font}`);
        }

        const obj = require(this.fontpath + font);

        if (!isset(obj.name)) {
            this.Error('Could not include font definition file');
        }

        if (isset(obj.enc)) {
            obj.enc = strtolower(obj.enc);
        }

        if (!isset(obj.subsetted)) {
            obj.subsetted = false;
        }


        return { ...obj }
    }

    _isascii(s) {
        // Test if string is ASCII
        let nb = strlen(s);
        for (let i = 0; i < nb; i++) {
            
            if (ord(s.charAt(i)) > 127) {
                return false;
            }

        }

        return true;
    }
    
    _TextToAscii(s) {
        // Test if string is ASCII
        let nb = strlen(s);
        let res=''
        for (let i = 0; i < nb; i++) {
            
            let c=s.codePointAt(i)
            res+=String.fromCodePoint(c)
    
        }
        return res
    }

    _httpencode(param, value, isUTF8) {}

    _UTF8toUTF16(s) {
        // Convert UTF-8 to UTF-16BE with BOM
        let res = "\xFE\xFF";
        let nb = strlen(s);
        let i = 0;

        while (i < nb) {
            let c1 = ord(s.charAt(i++));
            if (c1 >= 224) {
                // 3-byte character
                let c2 = ord(s.charAt(i++));
                let c3 = ord(s.charAt(i++));
                res += chr(((c1 & 0x0F) << 4) + ((c2 & 0x3C) >> 2));
                res += chr(((c2 & 0x03) << 6) + (c3 & 0x3F));

            } else if (c1 >= 192) {
                // 2-byte character
                let c2 = ord(s.charAt(i++));
                $res += chr((c1 & 0x1C) >> 2);
                $res += chr(((c1 & 0x03) << 6) + (c2 & 0x3F));

            } else {
                // Single-byte character
                res += "\0" + chr(c1);
            }
        }

        return res;
    }

    _escape(s) {
        // Escape special characters
        if (strpos(s, '(') !== -1 || strpos(s, ')') !== -1 || strpos(s, '\\') !== -1 || strpos(s, "\r") !== -1) {

            s = str_replace('\\', '\\\\', s);
            s = str_replace('(', '\\(', s);
            s = str_replace(')', '\\)', s);
            s = str_replace('\r', '\\r', s);

            return s
        } else {
            return s
        }

    }

    _textstring(s) {
        // Format a text string
        if (!this._isascii(s)) {
            s = this._UTF8toUTF16(s);
        }

        return `(${this._escape(s)})`;
    }

    _dounderline(x, y, txt) {
        // Underline text
        let up = this.CurrentFont['up'];
        let ut = this.CurrentFont['ut'];
        let w = this.GetStringWidth(txt) + this.ws * substr_count(txt, ' ');

        return sprintf('%.2f %.2f %.2f %.2f re f', x * this.k, (this.h - (y - up / 1000 * this.FontSize)) * this.k, w * this.k, -ut / 1000 * this.FontSizePt);
    }

    _parsejpg(file) {

        const a = LoadJpeg(file)

        if (!a) {
            this.Error('Missing or incorrect image file: ' + file);
        }

        let colspace
        if (!isset(a.channels) || a.channels == 3) {
            colspace = 'DeviceRGB';
        } else if ($a['channels'] == 4) {
            colspace = 'DeviceCMYK';
        } else {
            colspace = 'DeviceGray';
        }

        let bpc = isset(a.bits) ? a.bits : 8;
        let data = a.data
        return { 'w': a.width, 'h': a.height, 'cs': colspace, 'bpc': bpc, 'f': 'DCTDecode', 'data': data }
    }

    _parsepng(file) {   
           
        const f =fs.openSync(file)
        const info= this._parsepngstream(f,file)
        fs.closeSync(f)
        return info
 
    }

    _parsepngstream(f, file) {

        // Check signature
        if(this._readstream(f,8)!==`${chr(137)}PNG${chr(13)}${chr(10)}${chr(26)}${chr(10)}`){
            this.Error('Not a PNG file: '+file);
        }
            
        // Read header chunk
        this._readstream(f,4)
        if(this._readstream(f,4)!=='IHDR'){
            this.Error('Incorrect PNG file: '+file);
        }
        
        let w = this._readint(f);
        let h = this._readint(f);
        let bpc = ord(this._readstream(f,1,true));
        if(bpc>8){
            this.Error('16-bit depth not supported: '+file);
        }

        let ct = ord(this._readstream(f,1,true));
        let colspace
        if(ct===0 || ct===4){
            colspace = 'DeviceGray';
        }else if(ct===2 || ct==6){
            colspace = 'DeviceRGB';
        }else if(ct===3){
            colspace = 'Indexed';
        }else{
            this.Error('Unknown color type: '+file); 
        }
        
        if(ord(this._readstream(f,1))!==0){
            this.Error('Unknown compression method: '+file);
        }
        if(ord(this._readstream(f,1))!==0){
            this.Error('Unknown filter method: '+file);
        }
        if(ord(this._readstream(f,1))!==0){
            this.Error('Interlacing not supported: '+file);
        }
        
        this._readstream(f,4);
        let dp = `/Predictor 15 /Colors ${(colspace=='DeviceRGB' ? 3 : 1)} /BitsPerComponent ${bpc} /Columns ${w}`;
    
        // Scan chunks looking for palette, transparency and image data
        let pal = '';
        let trns = '';
        let data = '';
        let n
        do {
            
            n = this._readint(f);   
            let type = this._readstream(f,4,true);
            if(type==='PLTE')
            {
                // Read palette
                pal = this._readstream(f,n);
                this._readstream(f,4);

            }else if(type==='tRNS')
            {
                // Read transparency info
                let t = this._readstream(f,n);
                if(ct==0){
                    trns = [ord(substr(t,1,1))]
                }else if($ct==2){
                    trns = [ord(substr(t,1,1)), ord(substr(t,3,1)), ord(substr(t,5,1))];
                }else{
                    let pos = strpos(t,chr(0));
                    if(pos!==-1){
                        $trns = [pos];
                    }
                        
                }
                this._readstream(f,4);
            }else if(type==='IDAT'){
                // Read image data block
                data += this._readstream(f,n,true);
                this._readstream(f,4);
            }else if(type=='IEND'){
                break;
            }else{
                this._readstream(f,n+4);
            }
            
        } while (n);

        if(colspace=='Indexed' && !pal){
            this.Error('Missing palette in '+file);
        }
        
        let info = {'w':w, 'h':h, 'cs':colspace, 'bpc':bpc, 'f':'FlateDecode', 'dp':dp, 'pal':pal, 'trns':trns};

        if(ct>=4){

            // Extract alpha channel
            if(!function_exists('zlib')){
                this.Error('Zlib not available, can\'t handle alpha channel: '+file);
            }
                
            data = gzuncompress(data);
            let color = '';
            let alpha = '';
            let hola='hola'
            if(ct===4){
                // Gray image
                let len = 2*w;
                for(let i=0;i<h;i++)
                {
                    let pos = (1+len)*i;
                    color += data[pos];
                    alpha += data[pos];
                    
                    let line = substr(data,pos+1,len);
                    color += str_replace(/(.)./s,'$1',line) //line.replace(/(.)./s,'$1');
                    alpha += str_replace(/(.)./s,'$1',line)  //line.replace(/.(.)/s,'$1');
                }

            }else{
                // RGB image
                let len = 4*w;
                for(let i=0;i<h;i++)
                {
                    let pos = (1+len)*i;
                    color += data[pos]
                    alpha += data[pos]
                    
                    let line = substr(data,pos+1,len);

                    color += str_replace(/(.{3})./s,'$1',line) //line.replace(,'$1');
                    alpha += str_replace(/(.{3})./s,'$1',line) //line.replace(/.{3}(.)/s,'$1');
                    
                }
            }

            data=undefined
            data = gzcompress(color);
            info['smask'] = gzcompress(alpha);
            this.WithAlpha = true;
            if(this.PDFVersion<'1.4'){
                this.PDFVersion = '1.4';
            }
                
        }

        info['data'] = data;
        return info

    }

    _readstream(f,n,lConver=true,Encode='binary') {
        
        // Read n bytes from stream
        let res =(lConver)?'':null;

        while(n>0)
        {
            let buffer =Buffer.alloc ? Buffer.alloc(n) : new Buffer(n);
            let read = fs.readSync(f, buffer, 0, n);
          
            if(!read){
                this.Error('Error while reading stream');
            }
            
            n -= read;
            if(lConver){
                res += buffer.toString(Encode);
            }else{
                res = buffer
            }
            
        }

        if(n>0){
            this.Error('Unexpected end of stream');
        }
            
        return res;
        
    }

    _readint(f) {
        
        // Read a 4-byte integer from stream
        const a = this._readstream(f,4,false);
        return a.readInt32BE()
    
    }

    _parsegif($file) {   /*
        // Extract info from a GIF file (via PNG conversion)
        if(!function_exists('imagepng'))
            $this->Error('GD extension is required for GIF support');
        if(!function_exists('imagecreatefromgif'))
            $this->Error('GD has no GIF read support');
        $im = imagecreatefromgif($file);
        if(!$im)
            $this->Error('Missing or incorrect image file: '.$file);
        imageinterlace($im,0);
        ob_start();
        imagepng($im);
        $data = ob_get_clean();
        imagedestroy($im);
        $f = fopen('php://temp','rb+');
        if(!$f)
            $this->Error('Unable to create memory stream');
        fwrite($f,$data);
        rewind($f);
        $info = $this->_parsepngstream($f,$file);
        fclose($f);
        return $info;
        */
    }

    _out(s) {

        // Add a line to the document
        if (this.state == 2)
            this.pages[this.page] += `${s}\n`;
        else if (this.state == 1)
            this._put(s);
        else if ($this.state == 0)
            this.Error('No page has been added yet');
        else if (this.state == 3)
            this.Error('The document is closed');

    }

    _put(s) { 
        
        if (!Buffer.isBuffer(s)) {
            s = Buffer.from(s + '\n', 'binary')
        }

        this.buffer.push(s)// += `${s}\n`; 
        this.offset+=s.length
    }

    _getoffset() { return this.offset }

    _newobj(n = null) {
        // Begin a new object
        if (n === null) {
            n = ++this.n;
        }

        this.offsets[n] = this._getoffset();
        this._put(`${n} 0 obj`);
    }

    _putstream(data) {
        this._put('stream');
        this._put(data);
        this._put('endstream');
    }

    _putstreamobject(data) {
        let entries
        let Result
        if (this.compress) {
            entries = '/Filter /FlateDecode ';
            Result = gzcompress(data);
        } else {
        
            entries = '';
            Result=data
        }

        entries += `/Length ${Result.length}`;
        this._newobj();
        this._put(`<<${entries}>>`);
        this._putstream(Result);
        this._put('endobj');
    }

    _putpage(n) {
        this._newobj();
        this._put('<</Type /Page');
        this._put('/Parent 1 0 R');

        if (isset(this.PageInfo[n]['size'])) {
            this._put(sprintf('/MediaBox [0 0 %.2f %.2f]', this.PageInfo[n]['size'][0], this.PageInfo[n]['size'][1]));
        }

        if (isset(this.PageInfo[n]['rotation'])) {
            this._put(`/Rotate ${this.PageInfo[n]['rotation']}`);
        }

        this._put('/Resources 2 0 R');

        if (isset(this.PageLinks[n])) {
            // Links
            let annots = '/Annots [';

            for (const key in this.PageLinks[n]) {

                const pl = this.PageLinks[n][key]
                let rect = sprintf('%.2f %.2f %.2f %.2f', pl[0], pl[1], pl[0] + pl[2], pl[1] - pl[3]);
                annots += `<</Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] `;

                if (is_string(pl[4])) {
                    annots += `/A <</S /URI /URI ${this._textstring($pl[4])}>>>>`;
                } else {
                    let l = this.links[pl[4]];
                    let h
                    if (isset(this.PageInfo[l[0]]['size']))
                        h = this.PageInfo[l[0]]['size'][1];
                    else
                        h = (this.DefOrientation === 'P') ? this.DefPageSize[1] * this.k : this.DefPageSize[0] * this.k;

                    annots += sprintf('/Dest [%d 0 R /XYZ 0 %.2f null]>>', this.PageInfo[l[0]]['n'], h - l[1] * this.k);
                }
            }

            this._put(`${annots}]`);
        }

        if (this.WithAlpha) {
            this._put('/Group <</Type /Group /S /Transparency /CS /DeviceRGB>>');
        }


        this._put(`/Contents ${(this.n + 1)} 0 R>>`);
        this._put('endobj');
        // Page content
        if (this.AliasNbPages) {
            this.pages[n] = str_replace(this.AliasNbPages, this.page, this.pages[n]);
        }

        this._putstreamobject(this.pages[n]);
    }

    _putpages() {
        let nb = this.page;
        for (let n = 1; n <= nb; n++) {
            this.PageInfo[n]['n'] = this.n + 1 + 2 * (n - 1);
        }

        for (let n = 1; n <= nb; n++) {
            this._putpage(n);
        }

        // Pages root
        this._newobj(1);
        this._put('<</Type /Pages');
        let kids = '/Kids [';
        for (let n = 1; n <= nb; n++) {
            kids += `${this.PageInfo[n]['n']} 0 R `;
        }

        this._put(kids + ']');
        this._put(`/Count ${nb}`);

        let w, h
        if (this.DefOrientation === 'P') {
            w = this.DefPageSize[0];
            h = this.DefPageSize[1];
        } else {
            w = this.DefPageSize[1];
            h = this.DefPageSize[0];
        }

        this._put(sprintf('/MediaBox [0 0 %.2f %.2f]', w * this.k, h * this.k));
        this._put('>>');
        this._put('endobj');
    }

    _putfonts() {

        for (const key in this.FontFiles) {

            // Font file embedding
            const info = this.FontFiles[key]
            this._newobj()
            this.FontFiles[key]['n'] = this.n
            let font = fs.readFileSync(this.fontpath + key);

            if (!font) {
                this.Error('Font file not found: ' + file)
            }
            let compressed = (substr(key, -2) == '.z')
            if (!compressed && isset(info['length2'])) {
                font = substr(font, 6, info['length1']).substr(font, 6 + info['length1'] + 6, info['length2']);
            }
            this._put(`<</Length ${strlen(font)}`)
            if (compressed) {
                this._put('/Filter /FlateDecode');
            }

            this._put(`/Length1 ${info['length1']}`)
            if (isset(info['length2'])) {
                this._put(`/Length2 ${info['length2']} /Length3 0`);
            }

            this._put('>>');
            this._putstream(font);
            this._put('endobj');
        }

        //this.fonts as $k=>$font)
        for (const k in this.fonts) {

            let font = this.fonts[k]
            let s
            // Encoding
            if (isset(font['diff'])) {

                if (!isset(this.encodings[font['enc']])) {

                    this._newobj();
                    this._put(`<</Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [${font['diff']}]>>`);
                    this._put('endobj');
                    this.encodings[font['enc']] = this.n;
                }
            }

            // ToUnicode CMap
            let cmapkey
            if (isset(font['uv'])) {

                if (isset(font['enc'])) {
                    cmapkey = font['enc']
                } else {
                    cmapkey = font['name']
                }

                if (!isset(this.cmaps[cmapkey])) {
                    let cmap = this._tounicodecmap(font['uv']);
                    this._putstreamobject(cmap);
                    this.cmaps[cmapkey] = this.n;
                }

            }

            // Font object
            this.fonts[k]['n'] = this.n + 1;
            let type = font['type'];
            let name = font['name'];

            if (font['subsetted']) {
                name = 'AAAAAA+' + name;
            }

            if (type == 'Core') {
                // Core font
                this._newobj();
                this._put('<</Type /Font');
                this._put('/BaseFont /' + name);
                this._put('/Subtype /Type1');

                if (name !== 'Symbol' && name !== 'ZapfDingbats') {
                    this._put('/Encoding /WinAnsiEncoding');
                }

                if (isset(font['uv'])) {
                    this._put(`/ToUnicode ${this.cmaps[cmapkey]} 0 R`);
                }

                this._put('>>');
                this._put('endobj');

            } else if (type === 'Type1' || type === 'TrueType') {
                // Additional Type1 or TrueType/OpenType font
                this._newobj();
                this._put('<</Type /Font');
                this._put(`/BaseFont /${name}`);
                this._put(`/Subtype /${type}`);
                this._put('/FirstChar 32 /LastChar 255');
                this._put(`/Widths ${(this.n + 1)} 0 R`);
                this._put(`/FontDescriptor ${(this.n + 2)} 0 R`);

                if (isset(font['diff'])) {
                    this._put(`/Encoding ${this.encodings[font['enc']]} 0 R`);
                } else {
                    this._put('/Encoding /WinAnsiEncoding');
                }

                if (isset(font['uv'])) {
                    this._put(`/ToUnicode ${this.cmaps[cmapkey]} 0 R`);
                }
                this._put('>>');
                this._put('endobj');
                // Widths

                this._newobj()
                let cw = font['cw']
                s = '['

                for (let i = 32; i <= 255; i++) {
                    s += cw[chr(i)] + ' ';
                }

                this._put(s + ']');
                this._put('endobj');

                // Descriptor
                this._newobj();
                s = '<</Type /FontDescriptor /FontName /' + name;

                //foreach($font['desc'] as $k=>$v)
                for (const key in font['desc']) {
                    s += ` /${k} ${v}`
                }

                if (!font['file']) {
                    s += ` /FontFile${type === 'Type1' ? '' : '2'} ${this.FontFiles[font['file']]['n']} 0 R`
                }

                this._put(s + '>>');
                this._put('endobj');

            } else {
                // Allow for additional types
                let mtd = '_put' + strtolower(type);
                if (!method_exists(this, mtd)) {
                    this.Error('Unsupported font type: ' + type);
                }

                this.mtd(font);
            }

        }
    }

    _tounicodecmap(uv) {
        let ranges = '';
        let nbr = 0;
        let chars = '';
        let nbc = 0;

        for (const key in uv) {

            let v = uv[key]

            if (is_array(v)) {
                ranges += sprintf("<%02X> <%02X> <%04X>\n", key, key + v[1] - 1, v[0]);
                nbr++;
            } else {
                chars += sprintf("<%02X> <%04X>\n", key, v);
                nbc++;
            }

        }

        let s = "/CIDInit /ProcSet findresource begin\n";
        s += "12 dict begin\n";
        s += "begincmap\n";
        s += "/CIDSystemInfo\n";
        s += "<</Registry (Adobe)\n";
        s += "/Ordering (UCS)\n";
        s += "/Supplement 0\n";
        s += ">> def\n";
        s += "/CMapName /Adobe-Identity-UCS def\n";
        s += "/CMapType 2 def\n";
        s += "1 begincodespacerange\n";
        s += "<00> <FF>\n";
        s += "endcodespacerange\n";

        if (nbr > 0) {
            s += `${nbr} beginbfrange\n`;
            s += `${ranges}`;
            s += "endbfrange\n";
        }

        if (nbc > 0) {
            s += `${nbc} beginbfchar\n`;
            s += chars;
            s += "endbfchar\n";
        }

        s += "endcmap\n";
        s += "CMapName currentdict /CMap defineresource pop\n";
        s += "end\n";
        s += "end";

        return s;
    }

    _putimages() {

        for (const key in this.images) {
            
            const image = this.images[key];
            this._putimage(image);
            delete this.images[key].data
            delete this.images[key].smask
        }

    }

    _putimage(info) {

        this._newobj();
        
        info['n'] = this.n;
        
        this._put('<</Type /XObject');
        this._put('/Subtype /Image');
        this._put(`/Width ${info['w']}`);
        this._put(`/Height ${info['h']}`);

        if(info['cs']==='Indexed'){
            this._put(`/ColorSpace [/Indexed /DeviceRGB ${strlen(info['pal'])/3-1} ${(this.n+1)} 0 R]`);
        }else{
            this._put(`/ColorSpace /${info['cs']}`);
            if(info['cs']==='DeviceCMYK'){
                this._put('/Decode [1 0 1 0 1 0 1 0]');
            }    
        }

        this._put(`/BitsPerComponent ${info['bpc']}`);
        if(isset(info['f'])){
            this._put(`/Filter /${info['f']}`);
        }
            
        if(isset(info['dp'])){
            this._put(`/DecodeParms <<${info['dp']}>>`);
        }

        if(isset(info['trns']) && is_array(info['trns'])){
            
            let trns = '';
            for(let i=0;i<count(info['trns']);i++){
                trns +=` ${info['trns'][i]} ${info['trns'][$i]} `;
            }
                
            this._put(`/Mask [${trns}]`);
        }

        if(isset(info['smask'])){
            this._put(`/SMask ${(this.n+1)} 0 R`);
        }
            
        this._put(`/Length ${strlen(info['data'])}>>`);
        this._putstream(info['data']);
        this._put('endobj');

        // Soft mask
        if(isset(info['smask'])){
            let dp = `/Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${info['w']}`;
            let smask = {'w':info['w'], 'h':info['h'], 'cs':'DeviceGray', 'bpc':8, 'f':info['f'], 'dp':dp, 'data':info['smask']};
            this._putimage(smask);
        }

        // Palette
        if(info['cs']==='Indexed'){
            this._putstreamobject(info['pal']);
        }
             
    }

    _putxobjectdict() {
        
        for (const key in this.images) {
            const image = this.images[key];
            this._put(`/I${image['i']} ${image['n']} 0 R`);   
            
        }

    }

    _putresourcedict() {
        this._put('/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]');
        this._put('/Font <<');

        for (const key in this.fonts) {
            const font = this.fonts[key]
            this._put(`/F${font['i']} ${font['n']} 0 R`);
        }

        this._put('>>');
        this._put('/XObject <<');
        this._putxobjectdict();
        this._put('>>');
    }

    _putresources() {
        this._putfonts();
        this._putimages();
        // Resource dictionary
        this._newobj(2);
        this._put('<<');
        this._putresourcedict();
        this._put('>>');
        this._put('endobj');
    }

    _putinfo() {
        const date = new Date();
        const YYYYMMDDHHMMSS = date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2) + ("0" + date.getHours() + 1).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ("0" + date.getSeconds()).slice(-2);
        this.metadata['Producer'] = 'FPDF ' + this.PDFVersion
        this.metadata['CreationDate'] = 'D:' + YYYYMMDDHHMMSS;

        for (const key in this.metadata) {
            const value = this.metadata[key]
            this._put(`/${key} ${this._textstring(value)}`);
        }

    }

    _putcatalog() {
        let n = this.PageInfo[1]['n'];
        this._put('/Type /Catalog');
        this._put('/Pages 1 0 R');

        if (this.ZoomMode === 'fullpage')
            this._put(`/OpenAction [${n} 0 R /Fit]`);
        else if (this.ZoomMode === 'fullwidth')
            this._put(`/OpenAction [${n} 0 R /FitH null]`);
        else if (this.ZoomMode === 'real')
            this._put(`/OpenAction [${n} 0 R /XYZ null null 1]`);
        else if (!is_string(this.ZoomMode))
            this._put(`/OpenAction [${n} 0 R /XYZ null null ${sprintf('%.2f', this.ZoomMode / 100)}]`);

        if (this.LayoutMode === 'single')
            this._put('/PageLayout /SinglePage');
        else if (this.LayoutMode === 'continuous')
            this._put('/PageLayout /OneColumn');
        else if (this.LayoutMode === 'two')
            this._put('/PageLayout /TwoColumnLeft');
    }

    _putheader() {
        this._put('%PDF-' + this.PDFVersion);
    }

    _puttrailer() {
        this._put(`/Size ${this.n + 1}`);
        this._put(`/Root ${this.n} 0 R`);
        this._put(`/Info ${this.n - 1} 0 R`);
    }

    _enddoc() {
        this._putheader();
        this._putpages();
        this._putresources();
        // Info
        this._newobj();
        this._put('<<');
        this._putinfo();
        this._put('>>');
        this._put('endobj');
        // Catalog
        this._newobj();
        this._put('<<');
        this._putcatalog();
        this._put('>>');
        this._put('endobj');
        // Cross-ref
        let offset = this._getoffset();
        this._put('xref');
        this._put(`0 ${this.n + 1}`);
        this._put('0000000000 65535 f ');

        for (let i = 1; i <= this.n; i++) {
            this._put(sprintf('%010d 00000 n ', this.offsets[i]));
        }

        // Trailer
        this._put('trailer');
        this._put('<<');
        this._puttrailer();
        this._put('>>');
        this._put('startxref');
        this._put(offset);
        this._put('%%EOF');
        this.state = 3;
    }
}
