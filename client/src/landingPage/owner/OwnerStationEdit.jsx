// client/src/components/OwnerStationEdit.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api'; // ensure this exists and attaches Authorization header
import './owner.css';

export default function OwnerStationEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    lat: '',
    lng: '',
    status: 'draft',
    chargers: []
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // prefer axios wrapper so token is auto-attached
        let res;
        try {
          res = await API.get(`/owner/stations/${encodeURIComponent(id)}`);
        } catch (e) {
          // fallback to fetch if API is not configured
          const token = localStorage.getItem('token');
          res = await fetch(`/api/owner/stations/${encodeURIComponent(id)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          populateForm(data);
          return;
        }
        populateForm(res.data);
      } catch (err) {
        console.error('load station error', err);
        setError('Failed to load station: ' + (err.response?.data?.message || err.message));
        // redirect if auth problems
        if (err.response?.status === 401 || err.response?.status === 403) {
          alert('You must be logged in as owner to edit this station.');
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function populateForm(data) {
    setForm({
      name: data.name || '',
      address: data.address || '',
      phone: data.phone || '',
      lat: data.location?.coordinates ? String(data.location.coordinates[1]) : '',
      lng: data.location?.coordinates ? String(data.location.coordinates[0]) : '',
      status: data.status || 'draft',
      chargers: Array.isArray(data.chargers) ? data.chargers.map(c => ({
        type: c.type || 'AC',
        powerKw: c.powerKw ?? '',
        chargerCount: c.chargerCount ?? 1,
        pricePerKwh: c.pricePerKwh ?? ''
      })) : []
    });
  }

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateCharger(idx, key, value) {
    setForm(prev => {
      const chargers = [...prev.chargers];
      chargers[idx] = { ...chargers[idx], [key]: value };
      return { ...prev, chargers };
    });
  }

  function addCharger() {
    setForm(prev => ({ ...prev, chargers: [...prev.chargers, { type: 'AC', powerKw: '', chargerCount: 1, pricePerKwh: '' }] }));
  }

  function removeCharger(idx) {
    setForm(prev => ({ ...prev, chargers: prev.chargers.filter((_, i) => i !== idx) }));
  }

  // sanitize payload builder: only include keys that user edited or are required
  function buildPayload() {
    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      status: form.status
    };

    if (form.lat !== '' && form.lng !== '') {
      const latN = Number(form.lat);
      const lngN = Number(form.lng);
      if (Number.isFinite(latN) && Number.isFinite(lngN)) {
        payload.lat = latN;
        payload.lng = lngN;
      } else {
        throw new Error('Latitude and longitude must be valid numbers.');
      }
    }

    // sanitize chargers: only include if any present
    if (Array.isArray(form.chargers) && form.chargers.length > 0) {
      payload.chargers = form.chargers.map(c => {
        const obj = { type: c.type || 'AC' };
        if (c.powerKw !== '' && c.powerKw !== undefined && c.powerKw !== null) {
          const pw = Number(c.powerKw);
          if (Number.isFinite(pw)) obj.powerKw = pw;
        }
        if (c.chargerCount !== '' && c.chargerCount !== undefined && c.chargerCount !== null) {
          const cc = Number(c.chargerCount);
          obj.chargerCount = Number.isFinite(cc) && cc > 0 ? cc : 1;
        } else {
          obj.chargerCount = 1;
        }
        if (c.pricePerKwh !== '' && c.pricePerKwh !== undefined && c.pricePerKwh !== null) {
          const pr = Number(c.pricePerKwh);
          if (Number.isFinite(pr)) obj.pricePerKwh = pr;
        }
        return obj;
      });
    }

    return payload;
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);

    if (!form.name || form.name.trim() === '') {
      setError('Station name is required');
      return;
    }
    if ((form.lat && !form.lng) || (!form.lat && form.lng)) {
      setError('Both latitude and longitude required to update location');
      return;
    }

    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setError(err.message);
      return;
    }

    try {
      setSaving(true);
      console.log('PUT payload:', payload);

      // prefer axios wrapper
      let res;
      try {
        res = await API.put(`/owner/stations/${encodeURIComponent(id)}`, payload);
        console.log('Server response:', res.data);
      } catch (err) {
        // if API wrapper failed or returned error, show useful message
        console.error('API.put error', err);
        // if err.response exists it's axios
        if (err.response) {
          const body = err.response.data;
          throw new Error(body?.message || JSON.stringify(body) || `Status ${err.response.status}`);
        } else {
          // fallback fetch attempt (to see raw response)
          const token = localStorage.getItem('token');
          const fetchRes = await fetch(`/api/owner/stations/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
          });
          const txt = await fetchRes.text();
          if (!fetchRes.ok) throw new Error(txt || `Status ${fetchRes.status}`);
          const data = JSON.parse(txt);
          console.log('Fetch fallback success', data);
        }
      }

      alert('Station updated successfully');
      navigate('/owner/dashboard');
    } catch (err) {
      console.error('save error', err);
      setError(err.message || 'Update error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page"><h3>Loading station...</h3></div>;

  return (
    <div className="page">
      <h2>Edit Station</h2>
      {error && <div className="error">{error}</div>}
      <form className="station-form" onSubmit={handleSave}>
        <label>Name</label>
        <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />

        <label>Address</label>
        <input value={form.address} onChange={(e) => updateField('address', e.target.value)} />

        <label>Phone</label>
        <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />

        <label>Latitude</label>
        <input value={form.lat} onChange={(e) => updateField('lat', e.target.value)} placeholder="18.5204" />

        <label>Longitude</label>
        <input value={form.lng} onChange={(e) => updateField('lng', e.target.value)} placeholder="73.8567" />

        <label>Status</label>
        <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="suspended">Suspended</option>
        </select>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 700 }}>Chargers</label>
          {form.chargers.length === 0 && <div className="muted">No chargers configured</div>}
          {form.chargers.map((c, idx) => (
            <div key={idx} className="charger-row">
              <select value={c.type} onChange={(e) => updateCharger(idx, 'type', e.target.value)}>
                <option value="AC">AC</option>
                <option value="DC">DC</option>
              </select>
              <input type="number" value={c.powerKw ?? ''} placeholder="power kW" onChange={(e) => updateCharger(idx, 'powerKw', e.target.value)} />
              <input type="number" value={c.chargerCount ?? 1} min={1} onChange={(e) => updateCharger(idx, 'chargerCount', e.target.value)} />
              <input type="number" value={c.pricePerKwh ?? ''} placeholder="price/kWh" onChange={(e) => updateCharger(idx, 'pricePerKwh', e.target.value)} />
              <button type="button" className="btn-ghost" onClick={() => removeCharger(idx)}>Remove</button>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={addCharger}>Add Charger</button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/owner/dashboard')} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
