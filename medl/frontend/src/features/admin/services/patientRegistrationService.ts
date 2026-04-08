import { apiClient } from '@/services/apiClient';

export type EmergencyContactInput = { name: string; phone: string; relation: string };

export type RegisterPatientPayload = {
  email: string;
  password?: string;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  kebeleId?: string;
  location?: string;
  emergencyContacts: EmergencyContactInput[];
  idDocuments?: string[];
};

export type RegisterPatientResponse = {
  user: { id: string; email: string; name: string; role: string };
  patient: { id: string; healthId: string };
  temporaryPassword?: string;
  message: string;
};

export type RecentRegistrationRow = {
  user_id: string;
  email: string;
  name: string;
  time_utc: string;
  patient_id: string;
  patient_created: string;
};

export const patientRegistrationService = {
  async uploadIdDocuments(files: File[]): Promise<{ documents: { fileName: string; url: string }[] }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const { data } = await apiClient.post<{ documents: { fileName: string; url: string }[] }>(
      '/admin/upload-id',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  async registerPatient(payload: RegisterPatientPayload): Promise<RegisterPatientResponse> {
    const { data } = await apiClient.post<RegisterPatientResponse>('/admin/register-patient', payload);
    return data;
  },

  async checkEmail(email: string): Promise<{ exists: boolean }> {
    const { data } = await apiClient.get<{ exists: boolean }>('/admin/check-email', {
      params: { email: email.trim() },
    });
    return data;
  },

  async recentRegistrations(): Promise<{ registrations: RecentRegistrationRow[] }> {
    const { data } = await apiClient.get<{ registrations: RecentRegistrationRow[] }>(
      '/admin/recent-registrations'
    );
    return data;
  },
};
