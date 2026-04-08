import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useUI } from '@/contexts/UIContext';
import {
  patientRegistrationService,
  type RegisterPatientResponse,
  type RecentRegistrationRow,
} from '@/features/admin/services/patientRegistrationService';

const initialForm = () => ({
  fullName: '',
  dateOfBirth: '',
  gender: '' as '' | 'male' | 'female' | 'other',
  kebeleId: '',
  phone: '',
  email: '',
  initialPassword: '',
  woreda: 'jimma',
  kebele: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  idFileLabel: '' as string,
  idDocumentRefs: [] as string[],
});

function healthIdFromPatientId(patientId: string): string {
  return `ETH-${new Date().getFullYear()}-${patientId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { language, addNotification } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAmharic = language === 'am';
  const adminName = user?.name || (isAmharic ? 'ዶ/ር ተስፋዬ አየለ' : 'Dr. Tesfaye Ayele');
  const facilityName = isAmharic ? 'ጅማ ሆስፒታል' : 'Jimma Hospital';

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [uploadingIdDocs, setUploadingIdDocs] = useState(false);
  const [lastResult, setLastResult] = useState<RegisterPatientResponse | null>(null);
  const [recent, setRecent] = useState<RecentRegistrationRow[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [formAlert, setFormAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const { registrations } = await patientRegistrationService.recentRegistrations();
      setRecent(registrations);
    } catch {
      addNotification({
        type: 'error',
        title: isAmharic ? 'ስህተት' : 'Error',
        message: isAmharic ? 'የቅርብ ምዝገባዎችን መጫን አልተሳካም።' : 'Could not load recent registrations.',
      });
    } finally {
      setLoadingRecent(false);
    }
  }, [addNotification, isAmharic]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const resetForm = () => {
    setForm(initialForm());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildLocation = () => {
    const w = form.woreda || 'Jimma';
    const k = form.kebele?.trim();
    const base = `${isAmharic ? 'ኦሮሚያ' : 'Oromia'} / ${isAmharic ? 'ጅማ' : 'Jimma'} / ${w}`;
    return k ? `${base} / ${isAmharic ? 'ቀበሌ' : 'Kebele'}: ${k}` : base;
  };

  const handleRegister = async () => {
    setFormAlert(null);
    const incomplete =
      !form.fullName.trim() ||
      !form.dateOfBirth ||
      !form.gender ||
      !form.kebeleId.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      form.idDocumentRefs.length === 0 ||
      !form.woreda ||
      !form.kebele.trim() ||
      !form.emergencyName.trim() ||
      !form.emergencyPhone.trim() ||
      !form.emergencyRelation.trim();
    if (incomplete) {
      const message = isAmharic ? 'ሁሉንም የግዴታ መስኮች ይሙሉ።' : 'Please fill all required fields.';
      addNotification({
        type: 'warning',
        title: isAmharic ? 'ቅጽ ያጠናክሩ' : 'Complete the form',
        message,
      });
      setFormAlert({ type: 'warning', message });
      return;
    }

    const pwd = form.initialPassword.trim();
    if (pwd && pwd.length < 8) {
      const message = isAmharic
        ? 'የመጀመሪያ የይለፍ ቃል ቢኖር ቢያንስ 8 ቁምፊዎች መሆን አለበት።'
        : 'Initial password must be at least 8 characters, or leave blank for a temporary password.';
      addNotification({
        type: 'warning',
        title: isAmharic ? 'የይለፍ ቃል' : 'Password',
        message,
      });
      setFormAlert({ type: 'warning', message });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        email: form.email.trim(),
        name: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender as 'male' | 'female' | 'other',
        phone: form.phone.trim(),
        kebeleId: form.kebeleId.trim(),
        location: buildLocation(),
        idDocuments: form.idDocumentRefs,
        emergencyContacts: [
          {
            name: form.emergencyName.trim(),
            phone: form.emergencyPhone.trim(),
            relation: form.emergencyRelation.trim(),
          },
        ],
        ...(pwd ? { password: pwd } : {}),
      };
      const res = await patientRegistrationService.registerPatient(payload);
      setLastResult(res);
      addNotification({
        type: 'success',
        title: isAmharic ? 'ተመዝግቧል' : 'Registered',
        message: res.message,
      });
      resetForm();
      setFormAlert({ type: 'success', message: res.message });
      void loadRecent();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      addNotification({
        type: 'error',
        title: isAmharic ? 'ስህተት' : 'Error',
        message: msg || (isAmharic ? 'ምዝገባ አልተሳካም።' : 'Registration failed.'),
      });
      setFormAlert({
        type: 'error',
        message: msg || (isAmharic ? 'ምዝገባ አልተሳካም።' : 'Registration failed.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckDuplicates = async () => {
    const email = form.email.trim();
    if (!email) {
      addNotification({
        type: 'info',
        title: isAmharic ? 'ኢሜይል' : 'Email',
        message: isAmharic ? 'መጀመሪያ ኢሜይል ያስገቡ።' : 'Enter an email address first.',
      });
      return;
    }
    setChecking(true);
    try {
      const { exists } = await patientRegistrationService.checkEmail(email);
      addNotification({
        type: exists ? 'warning' : 'success',
        title: isAmharic ? 'ውጤት' : 'Result',
        message: exists
          ? isAmharic
            ? 'ይህ ኢሜይል አስቀድሞ ተመዝግቧል።'
            : 'This email is already registered.'
          : isAmharic
            ? 'ኢሜይል ነጻ ነው።'
            : 'Email is available.',
      });
    } catch {
      addNotification({
        type: 'error',
        title: isAmharic ? 'ስህተት' : 'Error',
        message: isAmharic ? 'መፈተሽ አልተሳካም።' : 'Could not check email.',
      });
    } finally {
      setChecking(false);
    }
  };

  const handlePrintCard = () => {
    if (!lastResult) return;
    const w = window.open('', '_blank', 'width=600,height=400');
    if (!w) {
      addNotification({
        type: 'warning',
        title: isAmharic ? 'ፖፕ-አፕ' : 'Pop-up',
        message: isAmharic ? 'ፖፕ-አፕ ይፍቀዱ።' : 'Allow pop-ups to print.',
      });
      return;
    }
    const { patient, user: u, temporaryPassword } = lastResult;
    w.document.write(
      `<html><head><title>Health ID</title></head><body style="font-family:sans-serif;padding:24px;">
      <h2>${isAmharic ? 'የጤና መታወቂያ' : 'Ethiopian Health ID'}</h2>
      <p><strong>ID:</strong> ${patient.healthId}</p>
      <p><strong>${isAmharic ? 'ስም' : 'Name'}:</strong> ${u.name}</p>
      <p><strong>Email:</strong> ${u.email}</p>
      ${temporaryPassword ? `<p><strong>${isAmharic ? 'ጊዜያዊ የይለፍ ቃል' : 'Temporary password'}:</strong> ${temporaryPassword}</p>` : ''}
      </body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        hidden
        onChange={async (e) => {
          const selected = Array.from(e.target.files ?? []);
          const names = selected.map((f) => f.name).join(', ');
          if (!selected.length) return;

          setUploadingIdDocs(true);
          setFormAlert(null);
          try {
            const { documents } = await patientRegistrationService.uploadIdDocuments(selected);
            setForm((f) => ({
              ...f,
              idFileLabel: names,
              idDocumentRefs: documents.map((d) => d.url),
            }));
            addNotification({
              type: 'success',
              title: isAmharic ? 'ፋይሎች' : 'Files',
              message: isAmharic
                ? 'የመታወቂያ ሰነዶች በተሳካ ሁኔታ ተጭነዋል።'
                : 'ID documents uploaded successfully.',
            });
          } catch (err: unknown) {
            const msg =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            setForm((f) => ({ ...f, idFileLabel: '', idDocumentRefs: [] }));
            addNotification({
              type: 'error',
              title: isAmharic ? 'ስህተት' : 'Error',
              message:
                msg ||
                (isAmharic
                  ? 'ሰነድ መጫን አልተሳካም። JPG/PNG/WEBP/PDF (እያንዳንዱ እስከ 5MB) ይጠቀሙ።'
                  : 'Document upload failed. Use JPG/PNG/WEBP/PDF (up to 5MB each).'),
            });
          } finally {
            setUploadingIdDocs(false);
          }
        }}
      />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          {isAmharic
            ? 'የታካሚ ምዝገባ - የተቋም አስተዳዳሪ ብቻ'
            : 'PATIENT REGISTRATION - FACILITY ADMIN ONLY'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isAmharic ? 'ገብተዋል፡ ' : 'Logged in as: '}
          <strong>{adminName}</strong> {isAmharic ? 'በ' : 'at '}
          <strong>{facilityName}</strong>
        </Typography>
      </Box>

      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'warning.light',
          bgcolor: 'warning.50',
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            {isAmharic ? '⚠️ በአካል መገኘት ያስፈልጋል' : '⚠️ IN-PERSON REGISTRATION REQUIRED'}
          </Typography>
          <Typography variant="body2">
            {isAmharic
              ? 'ታካሚው ከዋናው መታወቂያ ሰነድ ጋር መገኘት አለበት።'
              : 'Patient must be present with original ID document.'}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                {isAmharic ? 'የታካሚ ምዝገባ ቅጽ' : 'Patient Registration Form'}
              </Typography>
              {formAlert ? (
                <Alert severity={formAlert.type} sx={{ mb: 2 }}>
                  {formAlert.message}
                </Alert>
              ) : null}

              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
                {isAmharic ? 'የታካሚ መረጃ' : 'Patient Information'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'ሙሉ ስም' : 'Full Name'}
                    placeholder={isAmharic ? 'የታካሚውን ሙሉ ስም ያስገቡ' : "Enter patient's full name"}
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label={isAmharic ? 'የትውልድ ቀን' : 'Date of Birth'}
                    InputLabelProps={{ shrink: true }}
                    required
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth required>
                    <InputLabel>{isAmharic ? 'ጾታ' : 'Gender'}</InputLabel>
                    <Select
                      label={isAmharic ? 'ጾታ' : 'Gender'}
                      value={form.gender}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gender: e.target.value as typeof f.gender }))
                      }
                    >
                      <MenuItem value="male">{isAmharic ? 'ወንድ' : 'Male'}</MenuItem>
                      <MenuItem value="female">{isAmharic ? 'ሴት' : 'Female'}</MenuItem>
                      <MenuItem value="other">{isAmharic ? 'ሌላ' : 'Other'}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'የቀበሌ መታወቂያ ቁጥር' : 'Kebele ID Number'}
                    placeholder={
                      isAmharic ? 'የቀበሌ መታወቂያ ቁጥር ያስገቡ' : 'Enter Kebele ID number'
                    }
                    required
                    value={form.kebeleId}
                    onChange={(e) => setForm((f) => ({ ...f, kebeleId: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ height: '100%' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingIdDocs}
                  >
                    {uploadingIdDocs
                      ? isAmharic
                        ? '⏳ እየተጫነ ነው...'
                        : '⏳ UPLOADING...'
                      : form.idFileLabel
                      ? isAmharic
                        ? `📎 ${form.idFileLabel.slice(0, 24)}…`
                        : `📎 ${form.idFileLabel.slice(0, 24)}…`
                      : isAmharic
                        ? '📎 ፊት/ኋላ ስቀል'
                        : '📎 UPLOAD FRONT/BACK'}
                  </Button>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
                {isAmharic ? 'የመገናኛ መረጃ' : 'Contact Information'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'የስልክ ቁጥር' : 'Phone Number'}
                    placeholder="0911-234-567"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label={isAmharic ? 'ኢሜይል (መግቢያ)' : 'Email (login)'}
                    placeholder="patient@email.com"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label={isAmharic ? 'የመጀመሪያ የይለፍ ቃል (አማራጭ)' : 'Initial password (optional)'}
                    helperText={
                      isAmharic
                        ? 'ባዶ ከተተወ ጊዜያዊ የይለፍ ቃል ይፈጠራል።'
                        : 'Leave blank to auto-generate a temporary password (min 8 chars if set).'
                    }
                    value={form.initialPassword}
                    onChange={(e) => setForm((f) => ({ ...f, initialPassword: e.target.value }))}
                    autoComplete="new-password"
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
                {isAmharic ? 'የአካባቢ መረጃ' : 'Location Information'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'ክልል' : 'Region'}
                    value={isAmharic ? 'ኦሮሚያ' : 'Oromia'}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'ዞን' : 'Zone'}
                    value={isAmharic ? 'ጅማ' : 'Jimma'}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth required>
                    <InputLabel>{isAmharic ? 'ወረዳ' : 'Woreda'}</InputLabel>
                    <Select
                      label={isAmharic ? 'ወረዳ' : 'Woreda'}
                      value={form.woreda}
                      onChange={(e) => setForm((f) => ({ ...f, woreda: e.target.value }))}
                    >
                      <MenuItem value="">{isAmharic ? 'ይምረጡ' : 'Select'}</MenuItem>
                      <MenuItem value="jimma">{isAmharic ? 'ጅማ' : 'Jimma'}</MenuItem>
                      <MenuItem value="seka">{isAmharic ? 'ሰካ' : 'Seka'}</MenuItem>
                      <MenuItem value="gera">{isAmharic ? 'ጌራ' : 'Gera'}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'ቀበሌ' : 'Kebele'}
                    placeholder={isAmharic ? 'የቀበሌ ቁጥር/ስም ያስገቡ' : 'Enter kebele number/name'}
                    required
                    value={form.kebele}
                    onChange={(e) => setForm((f) => ({ ...f, kebele: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1 }}>
                {isAmharic ? 'የድንገተኛ አደጋ መጠናኛ' : 'Emergency Contact'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'ስም' : 'Name'}
                    placeholder={isAmharic ? 'ሙሉ ስም' : 'Full name'}
                    required
                    value={form.emergencyName}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'ስልክ' : 'Phone'}
                    placeholder="0912-345-678"
                    required
                    value={form.emergencyPhone}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={isAmharic ? 'ዝምድና' : 'Relation'}
                    placeholder={
                      isAmharic ? 'ለምሳሌ፡ ወንድም፣ እህት፣ እናት' : 'e.g., Brother, Sister, Mother'
                    }
                    required
                    value={form.emergencyRelation}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyRelation: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  justifyContent: 'space-between',
                  mt: 3,
                }}
              >
                <Button variant="outlined" onClick={() => void handleCheckDuplicates()} disabled={checking}>
                  {checking ? <CircularProgress size={20} /> : isAmharic ? '🔍 ተደጋጋሚነት አረጋግጥ' : '🔍 CHECK FOR DUPLICATES'}
                </Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      setFormAlert(null);
                      resetForm();
                    }}
                    disabled={submitting}
                  >
                    {isAmharic ? '❌ ሰርዝ' : '❌ CANCEL'}
                  </Button>
                  <Button variant="contained" color="primary" onClick={() => void handleRegister()} disabled={submitting}>
                    {submitting ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : isAmharic ? (
                      '✅ ታካሚ መዝግብ'
                    ) : (
                      '✅ REGISTER PATIENT'
                    )}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: lastResult ? 'success.light' : 'divider',
              mb: 3,
            }}
          >
            <CardContent>
              {lastResult ? (
                <>
                  <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                    {isAmharic ? '✅ ታካሚ በተሳካ ሁኔታ ተመዝግቧል' : '✅ PATIENT REGISTERED SUCCESSFULLY'}
                  </Typography>
                  <Typography variant="body2">
                    {isAmharic ? 'የኢትዮጵያ የጤና መታወቂያ፡ ' : 'Ethiopian Health ID: '}
                    <strong>{lastResult.patient.healthId}</strong>
                  </Typography>
                  <Typography variant="body2">
                    {isAmharic ? 'የታካሚ ስም፡ ' : 'Patient Name: '}
                    {lastResult.user.name}
                  </Typography>
                  <Typography variant="body2">Email: {lastResult.user.email}</Typography>
                  <Typography variant="body2">
                    {isAmharic ? 'የመዘገበው፡ ' : 'Registered By: '}
                    {adminName}
                  </Typography>
                  <Typography variant="body2">
                    {isAmharic ? 'ተቋም፡ ' : 'Facility: '}
                    {facilityName}
                  </Typography>
                  {lastResult.temporaryPassword ? (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {isAmharic ? 'ጊዜያዊ የይለፍ ቃል፡ ' : 'Temporary password: '}
                      <strong>{lastResult.temporaryPassword}</strong>
                    </Typography>
                  ) : null}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    <Button size="small" variant="outlined" onClick={handlePrintCard}>
                      {isAmharic ? '🖨️ የጤና መታወቂያ ካርድ አትም' : '🖨️ PRINT HEALTH ID CARD'}
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => setProfileOpen(true)}>
                      {isAmharic ? '👤 የታካሚ መገለጫ ተመልከት' : '👤 VIEW PATIENT PROFILE'}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setLastResult(null);
                        resetForm();
                      }}
                    >
                      {isAmharic ? '📋 አዲስ ታካሚ መዝግብ' : '📋 REGISTER NEW PATIENT'}
                    </Button>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {isAmharic
                    ? 'ታካሚ ካመዘገቡ በኋላ ማረጋገጫ እና ማተም እዚህ ይታያል።'
                    : 'After you register a patient, confirmation and print actions appear here.'}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                {isAmharic ? 'የቅርብ ጊዜ ምዝገባዎች' : 'Recent Registrations'}
              </Typography>
              {loadingRecent ? (
                <CircularProgress size={28} />
              ) : (
                <Table component={Paper} size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{isAmharic ? 'ሰዓት' : 'Time'} </TableCell>
                      <TableCell>{isAmharic ? 'ስም' : 'Name'}</TableCell>
                      <TableCell>{isAmharic ? 'የኢትዮጵያ የጤና መታወቂያ' : 'Ethiopian Health ID'}</TableCell>
                      <TableCell>{isAmharic ? 'አትም' : 'Print'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recent.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          {isAmharic ? 'ምንም ምዝገባ የለም።' : 'No registrations yet.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      recent.map((row) => (
                        <TableRow key={row.patient_id}>
                          <TableCell>{row.time_utc || '—'}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{healthIdFromPatientId(row.patient_id)}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => {
                                const w = window.open('', '_blank');
                                if (w) {
                                  w.document.write(
                                    `<html><body style="font-family:sans-serif;padding:16px;"><p><strong>${row.name}</strong></p><p>${healthIdFromPatientId(row.patient_id)}</p><p>${row.email}</p></body></html>`
                                  );
                                  w.document.close();
                                  w.print();
                                }
                              }}
                            >
                              🖨️
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isAmharic ? 'የታካሚ ማጠቃለያ' : 'Patient summary'}</DialogTitle>
        <DialogContent>
          {lastResult ? (
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: 13, m: 0 }}>
              {JSON.stringify(lastResult, null, 2)}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>{isAmharic ? 'ዝጋ' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
