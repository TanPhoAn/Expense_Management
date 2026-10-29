/**
 * PocketFlow Financial Statement Print & PDF Generator
 * Renders an Apple Card / Revolut-inspired vector PDF statement
 * with Executive KPI Banner, Top Outflows, Category Distribution, and Audit Ledger.
 */

import { StatementData } from '@/types';
import { formatVND, formatNumberVN } from '@/lib/utils/currency';
import { formatDateDDMMYYYY } from '@/lib/utils/export';

export function generateStatementHtml(data: StatementData): string {
  const { user, period, summary, topExpenses, categoryBreakdown, transactions, metadata } = data;

  const netSavingsPositive = summary.netSavings >= 0;
  const netSavingsFormatted = formatVND(Math.abs(summary.netSavings));

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PocketFlow_SaoKe_${period.startDate}_${period.endDate}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .statement-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 10px;
    }
    /* Header Section */
    .header-card {
      background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 18px;
      padding: 24px 28px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      position: relative;
      overflow: hidden;
    }
    .header-card::after {
      content: "";
      position: absolute;
      top: -50px;
      right: -50px;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%);
      border-radius: 50%;
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      color: white;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .badge-statement {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: rgba(255, 255, 255, 0.15);
      padding: 3px 8px;
      border-radius: 6px;
      margin-top: 2px;
      color: #cbd5e1;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .meta-box strong {
      color: #f8fafc;
      font-size: 12px;
    }
    .user-info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }
    .user-item {
      font-size: 11px;
      color: #94a3b8;
    }
    .user-item strong {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 2px;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 16px;
      position: relative;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-variant-numeric: tabular-nums;
      color: #0f172a;
    }
    .kpi-income { color: #059669; }
    .kpi-expense { color: #e11d48; }
    .kpi-savings { color: ${netSavingsPositive ? '#059669' : '#e11d48'}; }
    .kpi-rate { color: #4f46e5; }
    .kpi-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* Two Columns Section */
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 22px;
    }
    .section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Category Distribution */
    .cat-item {
      margin-bottom: 10px;
    }
    .cat-item:last-child {
      margin-bottom: 0;
    }
    .cat-head {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .cat-name {
      font-weight: 600;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .cat-amount {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-weight: 600;
      color: #475569;
    }
    .cat-bar-bg {
      width: 100%;
      height: 6px;
      background: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
    }
    .cat-bar-fill {
      height: 100%;
      border-radius: 999px;
    }

    /* Top Expenses */
    .top-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed #f1f5f9;
      font-size: 11px;
    }
    .top-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .top-rank {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .top-details {
      flex: 1;
      min-width: 0;
      margin-right: 8px;
    }
    .top-desc {
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .top-meta {
      font-size: 10px;
      color: #94a3b8;
    }
    .top-price {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-weight: 700;
      color: #e11d48;
      text-align: right;
      white-space: nowrap;
    }

    /* Transaction Ledger Table */
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      text-align: left;
    }
    .ledger-table th {
      background: #f8fafc;
      padding: 10px 12px;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    .ledger-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .ledger-table tr:last-child td {
      border-bottom: none;
    }
    .ledger-table tr:nth-child(even) {
      background: #fafbfd;
    }
    .col-num { text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; font-variant-numeric: tabular-nums; }
    .badge-type {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-income { background: #d1fae5; color: #065f46; }
    .badge-expense { background: #ffe4e6; color: #9f1239; }

    /* Footer Security */
    .statement-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #94a3b8;
    }
    .security-stamp {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      color: #64748b;
    }
    .print-button-bar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    }
    .print-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }
    @media print {
      .print-button-bar { display: none !important; }
      body { margin: 0; }
      .statement-container { max-width: 100%; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-button-bar">
    <button class="print-btn" onclick="window.print()">🖨️ In / Lưu PDF</button>
  </div>

  <div class="statement-container">
    <!-- Header -->
    <div class="header-card">
      <div class="brand-row">
        <div class="brand-logo">
          <div class="logo-badge">PF</div>
          <div>
            <div class="brand-name">PocketFlow</div>
            <div class="badge-statement">Báo cáo Sao kê Tài chính</div>
          </div>
        </div>
        <div class="meta-box">
          <div>Kỳ sao kê: <strong>${period.label}</strong></div>
          <div>Mã sao kê: <strong>${metadata.statementId}</strong></div>
          <div>Ngày xuất: ${formatDateDDMMYYYY(metadata.generatedAt.split('T')[0])}</div>
        </div>
      </div>

      <div class="user-info-row">
        <div class="user-item">
          Chủ tài khoản:
          <strong>${user.name}</strong>
        </div>
        <div class="user-item">
          Email liên kết:
          <strong style="font-family: ui-monospace, monospace; font-size: 12px;">${user.email}</strong>
        </div>
        <div class="user-item" style="text-align: right;">
          Tổng số giao dịch:
          <strong>${summary.transactionCount} giao dịch</strong>
        </div>
      </div>
    </div>

    <!-- Executive KPI Banner -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Tổng thu nhập</div>
        <div class="kpi-value kpi-income">+${formatVND(summary.totalIncome)}</div>
        <div class="kpi-sub">Dòng tiền vào trong kỳ</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Tổng chi tiêu</div>
        <div class="kpi-value kpi-expense">-${formatVND(summary.totalExpense)}</div>
        <div class="kpi-sub">TB ${formatVND(summary.dailyAverage)}/ngày</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Dòng tiền ròng</div>
        <div class="kpi-value kpi-savings">${netSavingsPositive ? '+' : '-'}${netSavingsFormatted}</div>
        <div class="kpi-sub">${netSavingsPositive ? 'Thặng dư tích lũy' : 'Bội chi thâm hụt'}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">Tỷ lệ tiết kiệm</div>
        <div class="kpi-value kpi-rate">${summary.savingsRate}%</div>
        <div class="kpi-sub">${summary.savingsRate >= 20 ? 'Tài chính khỏe mạnh' : 'Cần tối ưu chi tiêu'}</div>
      </div>
    </div>

    <!-- Insights Columns -->
    <div class="two-cols">
      <!-- Category Breakdown -->
      <div class="section-card">
        <div class="section-title">
          <span>Cơ cấu Chi tiêu</span>
          <span style="font-size: 10px; font-weight: normal; color: #94a3b8;">${categoryBreakdown.length} danh mục</span>
        </div>
        <div>
          ${
            categoryBreakdown.length === 0
              ? '<p style="color: #94a3b8; font-size: 11px; text-align: center; padding: 20px 0;">Chưa có dữ liệu chi tiêu</p>'
              : categoryBreakdown
                  .slice(0, 5)
                  .map(
                    (cat) => `
            <div class="cat-item">
              <div class="cat-head">
                <span class="cat-name">
                  <span class="cat-dot" style="background-color: ${cat.color};"></span>
                  ${cat.name}
                </span>
                <span class="cat-amount">${cat.percentage}% (${formatVND(cat.amount)})</span>
              </div>
              <div class="cat-bar-bg">
                <div class="cat-bar-fill" style="width: ${cat.percentage}%; background-color: ${cat.color};"></div>
              </div>
            </div>
          `
                  )
                  .join('')
          }
        </div>
      </div>

      <!-- Top 5 Expenses -->
      <div class="section-card">
        <div class="section-title">
          <span>Top 5 Khoản chi lớn nhất</span>
          <span style="font-size: 10px; font-weight: normal; color: #94a3b8;">Định lượng</span>
        </div>
        <div>
          ${
            topExpenses.length === 0
              ? '<p style="color: #94a3b8; font-size: 11px; text-align: center; padding: 20px 0;">Không có chi tiêu trong kỳ</p>'
              : topExpenses
                  .map(
                    (item, idx) => `
            <div class="top-item">
              <div class="top-rank">${idx + 1}</div>
              <div class="top-details">
                <div class="top-desc" title="${item.description}">${item.description}</div>
                <div class="top-meta">${formatDateDDMMYYYY(item.transactionDate)} • ${item.categoryName}</div>
              </div>
              <div class="top-price">${formatVND(item.amount)}</div>
            </div>
          `
                  )
                  .join('')
          }
        </div>
      </div>
    </div>

    <!-- Transaction Ledger Table -->
    <div class="table-container">
      <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #1e293b; display: flex; justify-content: space-between;">
        <span>Nhật ký giao dịch đối soát</span>
        <span style="font-size: 11px; font-weight: normal; color: #64748b;">${transactions.length} bản ghi</span>
      </div>
      <table class="ledger-table">
        <thead>
          <tr>
            <th style="width: 85px;">Ngày</th>
            <th style="width: 80px;">Loại</th>
            <th style="width: 120px;">Danh mục</th>
            <th>Nội dung giao dịch</th>
            <th class="col-num" style="width: 120px;">Số tiền (VND)</th>
          </tr>
        </thead>
        <tbody>
          ${
            transactions.length === 0
              ? '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">Không có giao dịch nào trong kỳ này</td></tr>'
              : transactions
                  .slice(0, 150)
                  .map(
                    (tx) => `
            <tr>
              <td style="font-family: ui-monospace, monospace; color: #64748b;">${formatDateDDMMYYYY(tx.transactionDate)}</td>
              <td>
                <span class="badge-type ${tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}">
                  ${tx.type === 'INCOME' ? 'Thu' : 'Chi'}
                </span>
              </td>
              <td style="font-weight: 600;">${tx.categoryName}</td>
              <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${tx.description}
                ${tx.note ? `<span style="color: #94a3b8; font-size: 10px;"> (${tx.note})</span>` : ''}
              </td>
              <td class="col-num" style="font-weight: 700; color: ${tx.type === 'INCOME' ? '#059669' : '#0f172a'};">
                ${tx.type === 'INCOME' ? '+' : '-'}${formatVND(tx.amount)}
              </td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>
      ${
        transactions.length > 150
          ? `<div style="padding: 8px 12px; text-align: center; font-size: 10px; color: #94a3b8; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              Hiển thị 150/${transactions.length} giao dịch gần nhất trên bản in. Toàn bộ dữ liệu chi tiết có thể xem trong file Excel/CSV.
            </div>`
          : ''
      }
    </div>

    <!-- Footer -->
    <div class="statement-footer">
      <div>
        PocketFlow Personal Finance Engine • Bản sao kê điện tử chính thức
      </div>
      <div class="security-stamp">
        <span>Xác thực mật mã:</span>
        <span style="font-weight: 700; color: #334155;">#${metadata.securityHash}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers browser print dialog to print or save the statement as PDF.
 * Uses window.open or hidden iframe for seamless cross-device mobile compatibility.
 */
export function triggerPrintStatement(data: StatementData) {
  const html = generateStatementHtml(data);

  // Try popup window first
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.warn('Print window error:', err);
      }
    }, 400);
    return;
  }

  // Fallback to hidden iframe (for mobile Safari and browsers blocking popups)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print error:', e);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 500);
  }
}
