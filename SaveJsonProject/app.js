// ─── DATA ────────────────────────────────────────────────────────────────────
let logs = [];
let editId = null;

function loadData() {
    try {
        const saved = localStorage.getItem("jsonLogManager");
        if (saved) logs = JSON.parse(saved);
    } catch (e) {
        logs = [];
    }
}

function saveData() {
    localStorage.setItem("jsonLogManager", JSON.stringify(logs));
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── ADD PANEL ───────────────────────────────────────────────────────────────
let addOpen = false;

function toggleAddPanel() {
    addOpen = !addOpen;
    document.getElementById("addBody").className =
        "add-panel-body" + (addOpen ? " open" : "");
    document.getElementById("addChevron").textContent = addOpen ? "▲" : "▼";
    if (!addOpen) resetForm();
}

function resetForm() {
    [
        "fMethod",
        "fPath",
        "fDesc",
        "fGroup",
        "fStatus",
        "fRequest",
        "fResponse",
        "fBankResponse",
        "fClientResponse",
        "fNotes",
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else el.value = "";
    });
    editId = null;
}

// ─── SAVE ────────────────────────────────────────────────────────────────────
function saveLog() {
    const path = document.getElementById("fPath").value.trim();
    if (!path) {
        showToast("⚠️ Vui lòng nhập Endpoint/Path");
        return;
    }

    const entry = {
        id: editId || uid(),
        method: document.getElementById("fMethod").value,
        path,
        desc: document.getElementById("fDesc").value.trim(),
        group:
            document.getElementById("fGroup").value.trim() || "Chưa phân nhóm",
        status: document.getElementById("fStatus").value,
        request: document.getElementById("fRequest").value.trim(),
        response: document.getElementById("fResponse").value.trim(),
        bankResponse: document.getElementById("fBankResponse").value.trim(),
        clientResponse: document.getElementById("fClientResponse").value.trim(),
        notes: document.getElementById("fNotes").value.trim(),
        time: new Date().toLocaleString("vi-VN"),
    };

    if (editId) {
        const idx = logs.findIndex((l) => l.id === editId);
        if (idx !== -1) logs[idx] = entry;
    } else {
        logs.unshift(entry);
    }

    saveData();
    renderAll();
    toggleAddPanel();
    showToast(editId ? "✏️ Đã cập nhật log!" : "✅ Đã lưu log mới!");
}

// ─── EDIT / DELETE ────────────────────────────────────────────────────────────
function editLog(id) {
    const e = logs.find((l) => l.id === id);
    if (!e) return;
    editId = id;
    document.getElementById("fMethod").value = e.method;
    document.getElementById("fPath").value = e.path;
    document.getElementById("fDesc").value = e.desc;
    document.getElementById("fGroup").value = e.group;
    document.getElementById("fStatus").value = e.status;
    document.getElementById("fRequest").value = e.request;
    document.getElementById("fResponse").value = e.response;
    document.getElementById("fBankResponse").value = e.bankResponse || "";
    document.getElementById("fClientResponse").value = e.clientResponse || "";
    document.getElementById("fNotes").value = e.notes;
    if (!addOpen) toggleAddPanel();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteLog(id) {
    if (!confirm("Xoá log này?")) return;
    logs = logs.filter((l) => l.id !== id);
    saveData();
    renderAll();
    showToast("🗑 Đã xoá log");
}

function clearAll() {
    if (!confirm("Xoá TẤT CẢ log? Không thể phục hồi!")) return;
    logs = [];
    saveData();
    renderAll();
    showToast("🗑 Đã xoá hết");
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
const groupState = {};
const detailState = {};
const tabState = {};

function renderAll() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    const filtered = q
        ? logs.filter((l) =>
              [l.path, l.desc, l.group, l.notes, l.method]
                  .join(" ")
                  .toLowerCase()
                  .includes(q),
          )
        : logs;

    // Nhóm logs theo group
    const groups = {};
    filtered.forEach((l) => {
        if (!groups[l.group]) groups[l.group] = [];
        groups[l.group].push(l);
    });

    const container = document.getElementById("logList");

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>Chưa có log nào. Hãy thêm log đầu tiên!</p></div>`;
        return;
    }

    let html = "";
    Object.entries(groups).forEach(([gName, gLogs]) => {
        const gKey = "g_" + gName;
        if (groupState[gKey] === undefined) groupState[gKey] = true;
        const open = groupState[gKey];

        html += `<div class="group-block">
      <div class="group-header" onclick="toggleGroup('${gKey}')">
        <div class="group-title">
          <span class="group-name">${escHtml(gName)}</span>
          <span class="group-desc">${gLogs.length} log${gLogs.length > 1 ? "s" : ""}</span>
        </div>
        <span class="group-chevron ${open ? "" : "collapsed"}">⌄</span>
      </div>
      <div class="group-body ${open ? "" : "collapsed"}">`;

        gLogs.forEach((l) => {
            const detOpen = detailState[l.id];
            const activeTab = tabState[l.id] || "request";
            const statusClass =
                l.status === "ok"
                    ? "status-ok"
                    : l.status === "err"
                      ? "status-err"
                      : "status-pending";

            html += `<div class="log-entry">
        <div class="log-header" onclick="toggleDetail('${l.id}')">
          <span class="method-badge method-${l.method}">${l.method}</span>
          <span class="log-path">${escHtml(l.path)}</span>
          <span class="log-desc">${escHtml(l.desc)}</span>
          <div class="log-meta">
            <span class="log-time">${l.time}</span>
            <span class="status-dot ${statusClass}" title="${l.status}"></span>
            <span style="font-size:18px;color:#aaa">${detOpen ? "▲" : "▼"}</span>
          </div>
        </div>
        <div class="log-detail ${detOpen ? "open" : ""}">
          <div class="detail-tabs">
            <div class="detail-tab ${activeTab === "request" ? "active" : ""}" onclick="switchTab('${l.id}','request')">📤 Client Request</div>
            <div class="detail-tab ${activeTab === "response" ? "active" : ""}" onclick="switchTab('${l.id}','response')">📨 Bank Request</div>
            <div class="detail-tab ${activeTab === "bankResponse" ? "active" : ""}" onclick="switchTab('${l.id}','bankResponse')">📩 Bank Response</div>
            <div class="detail-tab ${activeTab === "clientResponse" ? "active" : ""}" onclick="switchTab('${l.id}','clientResponse')">📥 Response Client</div>
            <div class="detail-tab ${activeTab === "notes" ? "active" : ""}" onclick="switchTab('${l.id}','notes')">📝 Notes</div>
          </div>
          <div class="detail-pane ${activeTab === "request" ? "active" : ""}">
            <div class="code-block" id="req_${l.id}">${formatJson(l.request)}<button class="copy-btn" onclick="copyCode('req_${l.id}')">Copy</button></div>
          </div>
          <div class="detail-pane ${activeTab === "response" ? "active" : ""}">
            <div class="code-block" id="res_${l.id}">${formatJson(l.response)}<button class="copy-btn" onclick="copyCode('res_${l.id}')">Copy</button></div>
          </div>
          <div class="detail-pane ${activeTab === "bankResponse" ? "active" : ""}">
            <div class="code-block" id="bankres_${l.id}">${formatJson(l.bankResponse)}<button class="copy-btn" onclick="copyCode('bankres_${l.id}')">Copy</button></div>
          </div>
          <div class="detail-pane ${activeTab === "clientResponse" ? "active" : ""}">
            <div class="code-block" id="clires_${l.id}">${formatJson(l.clientResponse)}<button class="copy-btn" onclick="copyCode('clires_${l.id}')">Copy</button></div>
          </div>
          <div class="detail-pane ${activeTab === "notes" ? "active" : ""}">
            <div style="font-size:14px;line-height:1.7;color:var(--text);white-space:pre-wrap;padding:4px 0">${l.notes ? escHtml(l.notes) : '<span style="color:#aaa">Không có ghi chú</span>'}</div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-secondary btn-sm" onclick="editLog('${l.id}')">✏️ Sửa</button>
            <button class="btn btn-danger btn-sm" onclick="deleteLog('${l.id}')">🗑 Xoá</button>
          </div>
        </div>
      </div>`;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function toggleGroup(key) {
    groupState[key] = !groupState[key];
    renderAll();
}

function toggleDetail(id) {
    detailState[id] = !detailState[id];
    renderAll();
}

function switchTab(id, tab) {
    event.stopPropagation();
    tabState[id] = tab;
    detailState[id] = true;
    renderAll();
}

// ─── FORMAT JSON ──────────────────────────────────────────────────────────────
function formatJson(str) {
    if (!str) return '<span style="color:#555">— Không có dữ liệu —</span>';
    try {
        const obj = JSON.parse(str);
        const pretty = JSON.stringify(obj, null, 2);
        return syntaxHighlight(pretty);
    } catch (e) {
        return escHtml(str);
    }
}

function syntaxHighlight(json) {
    return escHtml(json).replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = "number";
            if (/^"/.test(match)) cls = /:$/.test(match) ? "key" : "string";
            else if (/true|false/.test(match)) cls = "bool";
            else if (/null/.test(match)) cls = "null";
            return `<span class="${cls}">${match}</span>`;
        },
    );
}

function escHtml(s) {
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ─── COPY ─────────────────────────────────────────────────────────────────────
function copyCode(elemId) {
    event.stopPropagation();
    const el = document.getElementById(elemId);
    const text = el.innerText.replace("Copy", "").trim();
    navigator.clipboard
        .writeText(text)
        .then(() => showToast("📋 Đã copy!"))
        .catch(() => {});
}

// ─── EXPORT / IMPORT ─────────────────────────────────────────────────────────
function exportData() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `json-logs-${Date.now()}.json`;
    a.click();
    showToast("⬇ Đã xuất file JSON");
}

function triggerImport() {
    document.getElementById("importFile").click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data)) {
                if (
                    confirm(
                        `Nhập ${data.length} log? (Sẽ GỘP với dữ liệu hiện tại)`,
                    )
                ) {
                    logs = [...data, ...logs];
                    saveData();
                    renderAll();
                    showToast(`✅ Đã nhập ${data.length} log`);
                }
            } else {
                showToast("❌ File không hợp lệ");
            }
        } catch {
            showToast("❌ Lỗi đọc file JSON");
        }
        e.target.value = "";
    };
    reader.readAsText(file);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
}

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
function loadSample() {
    logs = [
        {
            id: uid(),
            method: "POST",
            path: "/bill/inquiry",
            desc: "6000 - Vấn tin thông tin hóa đơn",
            group: "01 - Bill Payment APIs",
            status: "ok",
            request: JSON.stringify(
                {
                    channel: "PARTNER",
                    partnerCode: "VNPT",
                    serviceCode: "ELECTRICITY",
                    customerId: "PE0123456",
                },
                null,
                2,
            ),
            response: JSON.stringify(
                {
                    channel: "BANK",
                    serviceCode: "ELECTRICITY",
                    customerId: "PE0123456",
                    amount: 350000,
                },
                null,
                2,
            ),
            bankResponse: JSON.stringify(
                {
                    bankCode: "00",
                    bankMessage: "Success",
                    transRef: "BANK20240229001",
                },
                null,
                2,
            ),
            clientResponse: JSON.stringify(
                {
                    responseCode: "00",
                    responseMessage: "Success",
                    data: {
                        billId: "BL001",
                        amount: 350000,
                        dueDate: "2024-02-29",
                        customerName: "Nguyen Van A",
                    },
                },
                null,
                2,
            ),
            notes: "Test case TC01 - Vấn tin thành công\nMôi trường: DEV",
            time: new Date().toLocaleString("vi-VN"),
        },
        {
            id: uid(),
            method: "POST",
            path: "/bill/init",
            desc: "6001 - Khởi tạo thanh toán hóa đơn",
            group: "01 - Bill Payment APIs",
            status: "err",
            request: JSON.stringify(
                {
                    channel: "PARTNER",
                    billId: "BL001",
                    amount: 350000,
                    transId: "TXN20240229001",
                },
                null,
                2,
            ),
            response: JSON.stringify(
                {
                    channel: "BANK",
                    billId: "BL001",
                    amount: 350000,
                    transId: "TXN20240229001",
                },
                null,
                2,
            ),
            bankResponse: JSON.stringify(
                { bankCode: "99", bankMessage: "System error", transRef: null },
                null,
                2,
            ),
            clientResponse: JSON.stringify(
                {
                    responseCode: "99",
                    responseMessage: "System error",
                    data: null,
                },
                null,
                2,
            ),
            notes: "Test case TC02 - Lỗi hệ thống\nBug: #1234 - Cần check lại service timeout",
            time: new Date().toLocaleString("vi-VN"),
        },
        {
            id: uid(),
            method: "POST",
            path: "/init-otp-for-billing",
            desc: "6666 - Xác thực FacePay và gửi OTP",
            group: "00 - Billing APIs",
            status: "pending",
            request: JSON.stringify(
                { phone: "0912345678", channel: "APP", deviceId: "dev-001" },
                null,
                2,
            ),
            response: "",
            bankResponse: "",
            clientResponse: "",
            notes: "Chưa test - đang chờ môi trường SIT",
            time: new Date().toLocaleString("vi-VN"),
        },
    ];
    saveData();
    renderAll();
    showToast("📦 Đã tải dữ liệu mẫu");
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadData();
if (logs.length === 0) loadSample();
else renderAll();
