const API_BASE = import.meta.env.VITE_API_URL || '/api';

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Certificate request failed (${response.status}).`);
  return data;
}

export async function listCertificateTemplates(token) {
  return jsonRequest('/certificates/templates', token);
}

export async function getCertificateTemplate(token, templateGroupId) {
  return jsonRequest(`/certificates/templates/${encodeURIComponent(templateGroupId)}`, token);
}

export async function saveCertificateTemplate(token, templateGroupId, template) {
  return jsonRequest(
    templateGroupId
      ? `/certificates/templates/${encodeURIComponent(templateGroupId)}`
      : '/certificates/templates',
    token,
    {
      method: templateGroupId ? 'PUT' : 'POST',
      body: JSON.stringify(template),
    },
  );
}

export async function setCertificateTemplateActive(token, templateGroupId, isActive) {
  return jsonRequest(`/certificates/templates/${encodeURIComponent(templateGroupId)}/active`, token, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function listMyCertificates(token) {
  return jsonRequest('/certificates/mine', token);
}

export async function downloadMyCertificate(token, certificateId) {
  const response = await fetch(
    `${API_BASE}/certificates/mine/${encodeURIComponent(certificateId)}/pdf`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Certificate download failed (${response.status}).`);
  }
  return response.blob();
}

export async function verifyCertificate(token) {
  const response = await fetch(`${API_BASE}/certificates/verify/${encodeURIComponent(token)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Unable to verify certificate.');
  return data.verification;
}
