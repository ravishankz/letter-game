// =========================================
// Informal Letter Structure Game v2.0
// =========================================

const letterParts = [
    {
        id: "sender-address",
        label: "Sender's Address",
        content: "No. 25,\nTemple Road,\nKandy.",
        previewId: "preview-address-block"
    },
    {
        id: "date",
        label: "Date",
        content: "15 July 2026",
        previewId: "preview-address-block"
    },
    {
        id: "salutation",
        label: "Salutation",
        content: "Dear Nimal,",
        previewId: "preview-salutation"
    },
    {
        id: "introduction",
        label: "Introduction",
        content: "I hope you are doing well. It has been a long time since we met.",
        previewId: "preview-intro"
    },
    {
        id: "body-details",
        label: "Body (Details)",
        content: "Last weekend my family and I visited the beautiful city of Galle. We explored the old Dutch Fort, enjoyed the sea breeze, and tasted delicious seafood. I thought of you because I know how much you enjoy travelling.",
        previewId: "preview-details"
    },
    {
        id: "conclusion",
        label: "Conclusion",
        content: "I hope we can visit this place together during the next school holiday. Please write back soon.",
        previewId: "preview-conclusion"
    },
    {
        id: "complimentary-close",
        label: "Complimentary Clause",
        content: "Yours lovingly,",
        previewId: "preview-close"
    },
    {
        id: "signature",
        label: "Signature",
        content: "Kasun",
        previewId: "preview-sig"
    },
    {
        id: "name",
        label: "Full Name",
        content: "Kasun Perera",
        previewId: "preview-name"
    }
];

let pointsScored = 0;
const totalTargets = letterParts.length;
let touchDragCard = null;
let touchClone = null;

// Audio Context for sound effects
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === "success") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === "error") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
            osc.frequency.setValueAtTime(180, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } else if (type === "win") {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                noteOsc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
                noteGain.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.1);
                noteGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.1 + 0.25);
                noteOsc.start(audioCtx.currentTime + idx * 0.1);
                noteOsc.stop(audioCtx.currentTime + idx * 0.1 + 0.25);
            });
        }
    } catch (e) {
        console.warn("Audio playback not supported or blocked", e);
    }
}

// =========================================
// Initialization & Reset
// =========================================

function initGame() {
    pointsScored = 0;
    updateScoreTracker();

    const container = document.getElementById("source-tags");
    container.innerHTML = "";

    // Clear completion banner
    document.getElementById("completion-banner").classList.add("hidden");

    // Clear previews
    ["preview-address-block", "preview-salutation", "preview-intro", "preview-details", "preview-conclusion", "preview-close", "preview-sig", "preview-name"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "";
    });

    // Reset Drop Zones
    const zones = document.querySelectorAll(".drop-zone");
    zones.forEach(zone => {
        zone.className = "drop-zone w-full h-12";
        zone.classList.remove("zone-success", "zone-error", "drag-over");
        zone.innerHTML = "";
        
        // Restore initial width classes based on position
        const expected = zone.dataset.expected;
        if (["sender-address", "date", "complimentary-close", "name"].includes(expected)) {
            zone.classList.add("w-52", "h-12");
        } else if (["salutation", "signature"].includes(expected)) {
            zone.classList.add("w-48", "h-12");
        } else if (expected === "body-details") {
            zone.classList.add("w-full", "h-16");
        } else {
            zone.classList.add("w-full", "h-12");
        }
    });

    // Create Shuffled Cards
    const shuffled = [...letterParts].sort(() => Math.random() - 0.5);

    shuffled.forEach(item => {
        const tag = document.createElement("div");
        tag.className = "border rounded-xl px-4 py-3 bg-white cursor-grab font-semibold text-gray-700 shadow-sm";
        tag.draggable = true;
        tag.id = `tag-${item.id}`;
        tag.dataset.targetId = item.id;
        tag.innerHTML = `
            <i class="fa-solid fa-grip-lines text-purple-400 mr-2"></i>
            ${item.label}
        `;

        // Mouse Drag Events
        tag.addEventListener("dragstart", e => {
            initAudio();
            e.dataTransfer.setData("text/plain", item.id);
        });

        // Touch Drag Events (Mobile)
        tag.addEventListener("touchstart", e => handleTouchStart(e, tag, item.id), { passive: false });
        tag.addEventListener("touchmove", handleTouchMove, { passive: false });
        tag.addEventListener("touchend", handleTouchEnd, { passive: false });

        container.appendChild(tag);
    });

    setupDropZones();
}

// =========================================
// Touch Event Handlers for Mobile
// =========================================

function handleTouchStart(e, card, id) {
    initAudio();
    touchDragCard = { card, id };
    const touch = e.touches[0];

    touchClone = card.cloneNode(true);
    touchClone.classList.add("dragging-touch");
    touchClone.style.width = `${card.offsetWidth}px`;
    touchClone.style.left = `${touch.clientX - card.offsetWidth / 2}px`;
    touchClone.style.top = `${touch.clientY - card.offsetHeight / 2}px`;

    document.body.appendChild(touchClone);
    card.style.opacity = "0.4";
}

function handleTouchMove(e) {
    if (!touchClone) return;
    e.preventDefault();
    const touch = e.touches[0];

    touchClone.style.left = `${touch.clientX - touchClone.offsetWidth / 2}px`;
    touchClone.style.top = `${touch.clientY - touchClone.offsetHeight / 2}px`;

    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    const zone = elementUnderTouch ? elementUnderTouch.closest(".drop-zone") : null;

    document.querySelectorAll(".drop-zone").forEach(z => z.classList.remove("drag-over"));
    if (zone && !zone.classList.contains("zone-success")) {
        zone.classList.add("drag-over");
    }
}

function handleTouchEnd(e) {
    if (!touchClone || !touchDragCard) return;

    const touch = e.changedTouches[0];
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    const zone = elementUnderTouch ? elementUnderTouch.closest(".drop-zone") : null;

    if (touchClone) touchClone.remove();
    touchDragCard.card.style.opacity = "1";

    document.querySelectorAll(".drop-zone").forEach(z => z.classList.remove("drag-over"));

    if (zone) {
        processDrop(touchDragCard.id, zone);
    }

    touchDragCard = null;
    touchClone = null;
}

// =========================================
// Drop Zone Logic
// =========================================

function setupDropZones() {
    const zones = document.querySelectorAll(".drop-zone");

    zones.forEach(zone => {
        zone.addEventListener("dragover", e => {
            e.preventDefault();
            if (!zone.classList.contains("zone-success")) {
                zone.classList.add("drag-over");
            }
        });

        zone.addEventListener("dragleave", () => {
            zone.classList.remove("drag-over");
        });

        zone.addEventListener("drop", e => {
            e.preventDefault();
            zone.classList.remove("drag-over");
            const droppedId = e.dataTransfer.getData("text/plain");
            processDrop(droppedId, zone);
        });
    });
}

function processDrop(droppedId, zone) {
    if (zone.classList.contains("zone-success")) return;

    const expectedId = zone.dataset.expected;
    const draggedCard = document.getElementById(`tag-${droppedId}`);

    // Correct Answer
    if (droppedId === expectedId) {
        playSound("success");

        const data = letterParts.find(item => item.id === droppedId);
        zone.classList.add("zone-success");

        zone.innerHTML = `
            <div class="status-badge bg-green-500">
                <i class="fa-solid fa-check"></i>
            </div>
            <span>${data.label}</span>
        `;

        if (draggedCard) {
            draggedCard.remove();
        }

        updatePreview(data);
        pointsScored++;
        updateScoreTracker();
        checkCompletion();
    } 
    // Wrong Answer
    else {
        playSound("error");

        const previousContent = zone.innerHTML;
        zone.classList.add("zone-error");

        zone.innerHTML = `
            <div class="status-badge bg-red-500">
                <i class="fa-solid fa-xmark"></i>
            </div>
            Try Again!
        `;

        setTimeout(() => {
            zone.classList.remove("zone-error");
            zone.innerHTML = previousContent;
        }, 1200);
    }
}

// =========================================
// Helper Functions
// =========================================

function updateScoreTracker() {
    const tracker = document.getElementById("score-tracker");
    if (tracker) {
        tracker.innerText = `${pointsScored} / ${totalTargets} Completed`;
    }
}

function updatePreview(data) {
    if (data.id === "sender-address" || data.id === "date") {
        const address = letterParts.find(item => item.id === "sender-address");
        const date = letterParts.find(item => item.id === "date");

        const addressPlaced = !document.getElementById("tag-sender-address");
        const datePlaced = !document.getElementById("tag-date");

        let text = "";

        if (addressPlaced) text += address.content;
        if (addressPlaced && datePlaced) text += "\n\n";
        if (datePlaced) text += date.content;

        const preview = document.getElementById("preview-address-block");
        preview.innerText = text;
    } else {
        const preview = document.getElementById(data.previewId);
        if (preview) {
            preview.innerText = data.content;
        }
    }
}

function checkCompletion() {
    if (pointsScored === totalTargets) {
        playSound("win");
        setTimeout(() => {
            document.getElementById("completion-banner").classList.remove("hidden");
        }, 400);
    }
}

// =========================================
// Event Listeners
// =========================================

window.addEventListener("DOMContentLoaded", () => {
    initGame();

    document.getElementById("btn-reset").addEventListener("click", initGame);
    document.getElementById("btn-play-again").addEventListener("click", initGame);
});