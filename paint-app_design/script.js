import CanvasUIObserver from './Observer/CanvasUIObserver.js';
import { CanvasSubject } from './Observer/CanvasSubject.js';

document.addEventListener('DOMContentLoaded',   () => {
    const canvas = document.getElementById('paintCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const colorPicker = document.getElementById('colorPicker');
    const sizePicker = document.getElementById('sizePicker');

    const clearCanvasButton = document.getElementById('clearCanvas');
    const saveCanvasButton = document.getElementById('saveCanvas');

    const drawRectButton = document.getElementById('drawRect');
    const drawCircleButton = document.getElementById('drawCircle');
    const drawLineButton = document.getElementById('drawLine');
    const drawTriangleButton = document.getElementById('drawTriangle');
    const drawHeartButton = document.getElementById('drawHeart');
    const drawStarButton = document.getElementById('drawStar');
    const fillCheckbox = document.getElementById('fillCheckbox');

    const brushToolButton = document.getElementById('brushTool');
    const eraserToolButton = document.getElementById('eraserTool');
    const sprayToolButton = document.getElementById('sprayTool');
    const oilBrushToolButton = document.getElementById('oilBrushTool');
    const markerToolButton = document.getElementById('markerTool');

    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');

    const canvasWidthInput = document.getElementById('canvasWidth');
    const canvasHeightInput = document.getElementById('canvasHeight');
    const resizeCanvasButton = document.getElementById('resizeCanvas');

    const toolInfo = document.getElementById('toolInfo');

    const paletteContainer = document.querySelector('.palette');

    const canvasSubject = new CanvasSubject();
    const canvasUIObserver = new CanvasUIObserver(canvasSubject);


    const palette = [
        "#000000", "#2D2D2D", "#5B5B5B", "#878787", "#B2B2B2", "#E0E0E0", "#FFFFFF", "#FFFFFF",
        "#FF6A00", "#FFD800", "#00FF21", "#0094FF", "#0026FF", "#B200FF", "#FFFFFF", "#FFFFFF"
    ];
    let colorIndex = 0;

    let painting = false;
    let tool = 'brush';
    let activeShape = null;
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO_STEPS = 20;

    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

    function startPosition(e) {
        painting = true;
        const rect = canvas.getBoundingClientRect();
        if (['rectangle', 'circle', 'line', 'triangle', 'heart', 'star'].includes(activeShape)) {
            canvas.startX = e.clientX - rect.left;
            canvas.startY = e.clientY - rect.top;
        } else {
            draw(e);
            canvasSubject.notifyObservers();
        }
    }

    function endPosition(e) {
        if (painting) {
            if (['rectangle', 'circle', 'line', 'triangle', 'heart', 'star'].includes(activeShape)) {
                drawShape(e);
            }
            undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            redoStack = [];
            if (undoStack.length > MAX_UNDO_STEPS) {
                undoStack.shift();
            }
        }
        painting = false;
        ctx.beginPath();
    }

    function updatePalette() {
        paletteContainer.innerHTML = "";
        paletteContainer.append(...palette.map((color, idx) => {
            const unit = document.createElement("div");
            unit.classList.add("paletteUnit");
            if (idx === colorIndex) {
                unit.classList.add("current");
                colorPicker.value = color;
            }
            unit.style.backgroundColor = color;
            unit.onclick = () => {
                colorIndex = idx;
                colorPicker.value = color;
                updatePalette();
            };
            return unit;
        }));
    }

    updatePalette();

    function draw(e) {
        if (!painting || activeShape) return;
        currentTool.draw(e);
    }

    class Tool {
        draw(e) {
            throw new Error("Method 'draw()' must be implemented.");
        }
    }

    class Brush extends Tool {
        constructor(ctx, colorPicker, sizePicker, opacitySlider) {
            super();
            this.ctx = ctx;
            this.colorPicker = colorPicker;
            this.sizePicker = sizePicker;
            this.opacitySlider = opacitySlider;
        }

        draw(e) {
            this.ctx.lineWidth = this.sizePicker.value;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = this.colorPicker.value;
            this.ctx.globalAlpha = this.opacitySlider.value;

            const [x, y] = getCursorPosition(e);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        }
    }


    class Eraser extends Tool {
        constructor(ctx, sizePicker) {
            super();
            this.ctx = ctx;
            this.sizePicker = sizePicker;
        }

        draw(e) {
            this.ctx.lineWidth = this.sizePicker.value;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = '#ffffff';

            const [x, y] = getCursorPosition(e);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        }
    }

    class Spray extends Tool {
        constructor(ctx, palette, colorIndex, sizePicker, opacitySlider) {
            super();
            this.ctx = ctx;
            this.palette = palette;
            this.colorIndex = colorIndex;
            this.sizePicker = sizePicker;
            this.opacitySlider = opacitySlider;
        }

        draw(e) {
            this.ctx.fillStyle = this.palette[this.colorIndex];
            const [x, y] = getCursorPosition(e);
            for (let i = 0; i < 10; i++) {
                const offsetX = Math.random() * this.sizePicker.value - this.sizePicker.value / 2;
                const offsetY = Math.random() * this.sizePicker.value - this.sizePicker.value / 2;
                this.ctx.globalAlpha = Math.random() * this.opacitySlider.value; // Використовуємо opacitySlider
                this.ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
            }
        }
    }
    class Marker extends Tool {
        constructor(ctx, colorPicker, sizePicker, opacitySlider) {
            super();
            this.ctx = ctx;
            this.colorPicker = colorPicker;
            this.sizePicker = sizePicker;
            this.opacitySlider = opacitySlider;
            this.initialAlpha = 0.5;
        }

        draw(e) {
            this.ctx.lineWidth = this.sizePicker.value;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = this.colorPicker.value;
            this.ctx.globalAlpha = this.initialAlpha * this.opacitySlider.value; // Використовуємо opacitySlider

            const [x, y] = getCursorPosition(e);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);

            this.resetAlpha();
        }

        resetAlpha() {
            this.ctx.globalAlpha = 1;
        }
    }

    class OilBrush extends Tool {
        constructor(ctx, colorPicker, sizePicker, opacitySlider) {
            super();
            this.ctx = ctx;
            this.colorPicker = colorPicker;
            this.sizePicker = sizePicker;
            this.opacitySlider = opacitySlider;
            this.density = 5;
            this.initialAlpha = 0.2;
        }

        draw(e) {
            this.ctx.lineWidth = this.sizePicker.value;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = this.colorPicker.value;
            this.ctx.globalAlpha = this.initialAlpha * this.opacitySlider.value; // Використовуємо opacitySlider

            const [x, y] = getCursorPosition(e);
            for (let i = 0; i < this.density; i++) {
                const offsetX = Math.random() * this.sizePicker.value - this.sizePicker.value / 2;
                const offsetY = Math.random() * this.sizePicker.value - this.sizePicker.value / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x + offsetX, y + offsetY);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
            this.resetAlpha();
        }
        resetAlpha() {
            this.ctx.globalAlpha = 1;
        }
    }

    class ToolFactory {
        static createTool(type, ctx, colorPicker, sizePicker, palette, colorIndex, opacitySlider) {
            switch (type) {
                case 'brush':
                    return new Brush(ctx, colorPicker, sizePicker, opacitySlider);
                case 'eraser':
                    return new Eraser(ctx, sizePicker, opacitySlider);
                case 'spray':
                    return new Spray(ctx, palette, colorIndex, sizePicker, opacitySlider);
                case 'oilBrush':
                    return new OilBrush(ctx, colorPicker, sizePicker, opacitySlider);
                case 'marker':
                    return new Marker(ctx, colorPicker, sizePicker, opacitySlider);
                default:
                    throw new Error("Unknown tool type.");
            }
        }
    }
    let currentTool = ToolFactory.createTool('brush', ctx, colorPicker, sizePicker, palette, colorIndex);

    const opacitySlider = document.getElementById('opacitySlider');

    opacitySlider.addEventListener('input', () => {
        if (currentTool && currentTool.hasOwnProperty('opacitySlider')) {
            currentTool.opacitySlider = opacitySlider;
        }
    });


    function drawShape(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const startX = canvas.startX;
        const startY = canvas.startY;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);

        ctx.lineWidth = sizePicker.value;
        ctx.strokeStyle = palette[colorIndex];
        ctx.fillStyle = palette[colorIndex];
        canvasSubject.notifyObservers();

        switch (activeShape) {
            case 'rectangle':
                drawRectangle(startX, startY, mouseX, mouseY);
                break;
            case 'circle':
                drawCircle(startX, startY, mouseX, mouseY);
                break;
            case 'line':
                drawLine(startX, startY, mouseX, mouseY);
                break;
            case 'triangle':
                drawTriangle(startX, startY, mouseX, mouseY);
                break;
            case 'star':
                drawStar(startX, startY, mouseX, mouseY);
                break;
            case 'heart':
                drawHeart(startX, startY, mouseX, mouseY);
                break;
            default:
                break;
        }
    }

    function drawStar(startX, startY, endX, endY) {
        var dx = endX - startX;
        var dy = endY - startY;
        var angle = Math.atan2(dy, dx);
        var starRadius = Math.sqrt(dx*dx + dy*dy) / 2; // Радіус зірки (можна налаштувати)

        ctx.lineCap = "round";
        ctx.lineWidth = 2; // Товщина зірки (можна налаштувати)
        ctx.beginPath();
        ctx.moveTo(startX + Math.cos(angle) * starRadius, startY + Math.sin(angle) * starRadius);

        for (var i = 0; i < 5; i++) {
            ctx.lineTo(startX + Math.cos(angle + i * Math.PI * 0.4) * starRadius,
                startY + Math.sin(angle + i * Math.PI * 0.4) * starRadius);
            ctx.lineTo(startX + Math.cos(angle + (i + 0.5) * Math.PI * 0.4) * starRadius * 0.5,
                startY + Math.sin(angle + (i + 0.5) * Math.PI * 0.4) * starRadius * 0.5);
        }

        ctx.closePath();
        if (fillCheckbox.checked) {
            ctx.fill(); // Заливаємо серце
        } else {
            ctx.stroke(); // Малюємо контур
        }

        ctx.restore();
    }


    function drawHeart(startX, startY, endX, endY) {
        var x = startX;
        var y = startY;
        var width = Math.abs(endX - startX);
        var height = Math.abs(endY - startY);

        ctx.save();
        ctx.beginPath();
        var topCurveHeight = height * 0.3;
        ctx.moveTo(x, y + topCurveHeight);
        // top left curve
        ctx.bezierCurveTo(
            x, y,
            x - width / 2, y,
            x - width / 2, y + topCurveHeight
        );

        // bottom left curve
        ctx.bezierCurveTo(
            x - width / 2, y + (height + topCurveHeight) / 2,
            x, y + (height + topCurveHeight) / 2,
            x, y + height
        );

        // bottom right curve
        ctx.bezierCurveTo(
            x, y + (height + topCurveHeight) / 2,
            x + width / 2, y + (height + topCurveHeight) / 2,
            x + width / 2, y + topCurveHeight
        );

        // top right curve
        ctx.bezierCurveTo(
            x + width / 2, y,
            x, y,
            x, y + topCurveHeight
        );

        ctx.closePath();

        if (fillCheckbox.checked) {
            ctx.fill(); // Заливаємо серце
        } else {
            ctx.stroke(); // Малюємо контур
        }

        ctx.restore();
    }



    function drawRectangle(startX, startY, endX, endY) {
        if (fillCheckbox.checked) {
            ctx.fillRect(startX, startY, endX - startX, endY - startY);
        } else {
            ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        }
    }

    function drawCircle(startX, startY, endX, endY) {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        if (fillCheckbox.checked) {
            ctx.fill();
        } else {
            ctx.stroke();
        }
    }

    function drawLine(startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    function drawTriangle(startX, startY, endX, endY) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(startX + (startX - endX), endY);
        ctx.closePath();
        if (fillCheckbox.checked) {
            ctx.fill();
        } else {
            ctx.stroke();
        }
    }

    function clearCanvas() {
        const confirmation = confirm('Are you sure you want to clear the canvas?');
        if (confirmation) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            undoStack = [];
            redoStack = [];
            undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
    }

    function saveCanvas() {
        const fileName = prompt('Enter the name for your painting:');
        if (fileName) {
            const link = document.createElement('a');
            link.download = `${fileName}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    }

    function undoLastAction() {
        if (undoStack.length > 1) {
            redoStack.push(undoStack.pop());
            const imageData = undoStack[undoStack.length - 1];
            ctx.putImageData(imageData, 0, 0);
        } else {
            alert("Cannot undo further.");
        }
    }

    function redoLastAction() {
        if (redoStack.length > 0) {
            const imageData = redoStack.pop();
            undoStack.push(imageData);
            ctx.putImageData(imageData, 0, 0);
        } else {
            alert("Cannot redo further.");
        }
    }

    function updateObjectInfo(object, size) {
        toolInfo.textContent = `Tool: ${object.charAt(0).toUpperCase() + object.slice(1)}, Size: ${size.value}`;
    }

    function setActiveTool(toolType, button) {
        activeShape = null;
        tool = toolType;
        currentTool = ToolFactory.createTool(toolType, ctx, colorPicker, sizePicker, palette, colorIndex, opacitySlider);
        document.querySelectorAll('.btn.tool').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        updateObjectInfo(tool, sizePicker);
    }

    function setActiveShape(shapeType, button) {
        tool = null;
        activeShape = shapeType;
        document.querySelectorAll('.btn.tool').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        updateObjectInfo(activeShape,sizePicker);
    }

    function getCursorPosition(e) {
        const rect = canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }

    const shapeSelector = document.getElementById('shapeSelector');

    shapeSelector.addEventListener('change', function() {
        const selectedShape = shapeSelector.value;
        setActiveShape(selectedShape);
    });


    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', endPosition);
    canvas.addEventListener('mousemove', draw);

    clearCanvasButton.addEventListener('click', clearCanvas);
    saveCanvasButton.addEventListener('click', saveCanvas);

    undoButton.addEventListener('click', undoLastAction);
    redoButton.addEventListener('click', redoLastAction);

    brushToolButton.addEventListener('click', () => setActiveTool('brush', brushToolButton));
    eraserToolButton.addEventListener('click', () => setActiveTool('eraser', eraserToolButton));
    sprayToolButton.addEventListener('click', () => setActiveTool('spray', sprayToolButton));
    oilBrushToolButton.addEventListener('click', () => setActiveTool('oilBrush', oilBrushToolButton));
    markerToolButton.addEventListener('click', () => setActiveTool('marker', markerToolButton));

    drawRectButton.addEventListener('click', () => setActiveShape('rectangle', drawRectButton));
    drawCircleButton.addEventListener('click', () => setActiveShape('circle', drawCircleButton));
    drawLineButton.addEventListener('click', () => setActiveShape('line', drawLineButton));
    drawTriangleButton.addEventListener('click', () => setActiveShape('triangle', drawTriangleButton));
    drawHeartButton.addEventListener('click', () => setActiveShape('heart', drawHeartButton));
    drawStarButton.addEventListener('click', () => setActiveShape('star', drawStarButton));


    resizeCanvasButton.addEventListener('click', () => {
        const width = parseInt(canvasWidthInput.value);
        const height = parseInt(canvasHeightInput.value);

        if (width > 0 && height > 0) {
            canvas.width = width;
            canvas.height = height;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            undoStack = [];
            redoStack = [];
            undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        } else {
            alert("Invalid canvas size.");
        }
    });

    colorPicker.addEventListener('input', (e) => {
        palette[colorIndex] = e.target.value;
        updatePalette();
    });

    setActiveTool('brush', brushToolButton);
});
