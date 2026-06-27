import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle2, Upload, FileText, User, Users, AlertCircle, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api, publicApi, academicsApi } from '@/lib/api';
import { toast } from 'sonner';

const STEPS = [
  { title: 'Personal Info', icon: User },
  { title: 'Parent/Guardian', icon: Users },
  { title: 'Academic', icon: GraduationCap },
  { title: 'Documents', icon: FileText },
  { title: 'Review', icon: CheckCircle2 },
];

export function PublicAdmissionPage() {
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState<number | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [showStatusCheck, setShowStatusCheck] = useState(false);
  const [statusId, setStatusId] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);

  const [form, setForm] = useState<any>({
    session_id: 1,
    first_name: '', last_name: '', other_names: '', gender: 'male',
    date_of_birth: '', nationality: 'Nigerian', state_of_origin: '', lga: '',
    religion: '', residential_address: '', applicant_email: '', applicant_phone: '',
    applying_for_class_id: 0, previous_school: '', previous_class: '',
    father_name: '', father_phone: '', father_email: '', father_occupation: '',
    mother_name: '', mother_phone: '', mother_email: '', mother_occupation: '',
    guardian_name: '', guardian_relationship: '', guardian_phone: '',
    guardian_email: '', guardian_address: '', guardian_occupation: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    emergency_contact_relationship: '', blood_group: '', genotype: '',
    allergies: '', medical_conditions: '',
  });

  const { data: classes } = useQuery({
    queryKey: ['public-classes'],
    queryFn: () => academicsApi.classes().then((r) => r.data),
  });

  const { data: sessions } = useQuery({
    queryKey: ['public-sessions'],
    queryFn: () => academicsApi.sessions().then((r) => r.data),
  });

  const draftMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          fd.append(k, String(v));
        }
      });
      return api.post('/admissions/public/draft', fd);
    },
    onSuccess: (res) => {
      setAppId(res.data.id);
      setReferenceNumber(res.data.reference_number);
      toast.success(`Draft saved. Reference: ${res.data.reference_number}`);
    },
    onError: () => toast.error('Failed to save draft'),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/admissions/public/${appId}/submit`),
    onSuccess: (res) => {
      toast.success('Application submitted successfully!');
      setStep(5);
    },
    onError: () => toast.error('Failed to submit application'),
  });

  const statusCheckMutation = useMutation({
    mutationFn: () => api.post('/admissions/public/check-status', { identifier: statusId }),
    onSuccess: (res) => setStatusResult(res.data),
    onError: () => {
      setStatusResult(null);
      toast.error('Application not found');
    },
  });

  const nextStep = async () => {
    if (step === 2 && !appId) {
      await draftMutation.mutateAsync();
    }
    setStep(step + 1);
  };

  const uploadDocument = async (file: File, type: string) => {
    if (!appId) {
      toast.error('Please save draft first');
      return;
    }
    const fd = new FormData();
    fd.append('document_type', type);
    fd.append('file', file);
    try {
      await api.post(`/admissions/public/${appId}/documents`, fd);
      toast.success('Document uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-lg">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold">Online Admission</h1>
            <p className="mt-2 text-lg text-muted-foreground">Apply to Caliphate International Schools Gusau</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setShowStatusCheck(true)}>
                <Clipboard className="mr-2 h-4 w-4" /> Check Status
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <div className="mb-8 flex justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const completed = i < step;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      completed ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="mt-2 hidden text-xs font-medium md:block">{s.title}</div>
                </div>
              );
            })}
          </div>

          <Card className="shadow-xl">
            <CardContent className="p-6">
              {/* Step 0: Personal Info */}
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Personal Information</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1"><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Other Names</Label><Input value={form.other_names} onChange={(e) => setForm({ ...form, other_names: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Gender *</Label>
                      <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="male">Male</option><option value="female">Female</option>
                      </select>
                    </div>
                    <div className="space-y-1"><Label>Date of Birth *</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Nationality</Label><Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
                    <div className="space-y-1"><Label>State of Origin</Label><Input value={form.state_of_origin} onChange={(e) => setForm({ ...form, state_of_origin: e.target.value })} /></div>
                    <div className="space-y-1"><Label>LGA</Label><Input value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Religion</Label><Input value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Phone</Label><Input value={form.applicant_phone} onChange={(e) => setForm({ ...form, applicant_phone: e.target.value })} /></div>
                    <div className="col-span-2 space-y-1"><Label>Email</Label><Input type="email" value={form.applicant_email} onChange={(e) => setForm({ ...form, applicant_email: e.target.value })} /></div>
                    <div className="col-span-2 space-y-1"><Label>Residential Address</Label><Textarea value={form.residential_address} onChange={(e) => setForm({ ...form, residential_address: e.target.value })} /></div>
                  </div>
                </div>
              )}

              {/* Step 1: Parent/Guardian */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Parent/Guardian Information</h2>
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">Father's Details</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1"><Label>Name</Label><Input value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Phone</Label><Input value={form.father_phone} onChange={(e) => setForm({ ...form, father_phone: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.father_email} onChange={(e) => setForm({ ...form, father_email: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Occupation</Label><Input value={form.father_occupation} onChange={(e) => setForm({ ...form, father_occupation: e.target.value })} /></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">Mother's Details</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1"><Label>Name</Label><Input value={form.mother_name} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Phone</Label><Input value={form.mother_phone} onChange={(e) => setForm({ ...form, mother_phone: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.mother_email} onChange={(e) => setForm({ ...form, mother_email: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Occupation</Label><Input value={form.mother_occupation} onChange={(e) => setForm({ ...form, mother_occupation: e.target.value })} /></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">Primary Guardian (if different)</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1"><Label>Name</Label><Input value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Relationship</Label><Input value={form.guardian_relationship} onChange={(e) => setForm({ ...form, guardian_relationship: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Phone</Label><Input value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.guardian_email} onChange={(e) => setForm({ ...form, guardian_email: e.target.value })} /></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">Emergency Contact</h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1"><Label>Name</Label><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Phone</Label><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Relationship</Label><Input value={form.emergency_contact_relationship} onChange={(e) => setForm({ ...form, emergency_contact_relationship: e.target.value })} /></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Academic */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Academic Information</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1"><Label>Academic Session *</Label>
                      <select value={form.session_id} onChange={(e) => setForm({ ...form, session_id: parseInt(e.target.value) })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        {(sessions || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><Label>Applying for Class *</Label>
                      <select value={form.applying_for_class_id} onChange={(e) => setForm({ ...form, applying_for_class_id: parseInt(e.target.value) })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                        <option value={0}>Select class</option>
                        {(classes || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><Label>Previous School</Label><Input value={form.previous_school} onChange={(e) => setForm({ ...form, previous_school: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Previous Class</Label><Input value={form.previous_class} onChange={(e) => setForm({ ...form, previous_class: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Blood Group</Label><Input value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Genotype</Label><Input value={form.genotype} onChange={(e) => setForm({ ...form, genotype: e.target.value })} /></div>
                    <div className="col-span-2 space-y-1"><Label>Allergies</Label><Textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></div>
                    <div className="col-span-2 space-y-1"><Label>Medical Conditions</Label><Textarea value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} /></div>
                  </div>
                </div>
              )}

              {/* Step 3: Documents */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Upload Documents</h2>
                  {!appId && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Save draft first</AlertTitle>
                      <AlertDescription>Please go back and save your application draft before uploading documents.</AlertDescription>
                    </Alert>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { type: 'passport_photo', label: 'Passport Photograph' },
                      { type: 'birth_certificate', label: 'Birth Certificate' },
                      { type: 'previous_result', label: 'Previous School Result' },
                      { type: 'guardian_id', label: "Guardian's ID" },
                    ].map((d) => (
                      <div key={d.type} className="rounded-lg border p-4">
                        <Label className="mb-2 block">{d.label}</Label>
                        <Input type="file" onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0], d.type)} disabled={!appId} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Review Application</h2>
                  <div className="space-y-3">
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-2">Personal Info</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Name:</span> {form.first_name} {form.last_name}</div>
                        <div><span className="text-muted-foreground">Gender:</span> {form.gender}</div>
                        <div><span className="text-muted-foreground">DOB:</span> {form.date_of_birth}</div>
                        <div><span className="text-muted-foreground">Nationality:</span> {form.nationality}</div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-2">Academic</h3>
                      <div className="text-sm">
                        <div><span className="text-muted-foreground">Class:</span> {(classes || []).find((c: any) => c.id === form.applying_for_class_id)?.name}</div>
                        <div><span className="text-muted-foreground">Session:</span> {(sessions || []).find((s: any) => s.id === form.session_id)?.name}</div>
                      </div>
                    </div>
                    {referenceNumber && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Reference Number: {referenceNumber}</AlertTitle>
                        <AlertDescription>Please save this reference number to check your admission status.</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Success */}
              {step === 5 && (
                <div className="text-center py-12">
                  <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
                  <p className="text-muted-foreground mb-4">Your reference number is: <strong>{referenceNumber}</strong></p>
                  <p className="text-sm text-muted-foreground">We will contact you via email/phone with next steps.</p>
                </div>
              )}

              {/* Navigation */}
              {step < 5 && (
                <div className="flex justify-between mt-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  {step < 4 ? (
                    <Button onClick={nextStep} disabled={draftMutation.isPending}>
                      Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                      Submit Application <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Status check dialog */}
      <Dialog open={showStatusCheck} onOpenChange={setShowStatusCheck}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Admission Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Reference Number, Email or Phone</Label>
              <Input value={statusId} onChange={(e) => setStatusId(e.target.value)} placeholder="CIS-2026-123456" />
            </div>
            {statusResult && (
              <div className="rounded-lg border p-4 space-y-2">
                <div><span className="text-muted-foreground">Name:</span> {statusResult.full_name}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{statusResult.status}</Badge></div>
                {statusResult.admission_number && (
                  <div><span className="text-muted-foreground">Admission Number:</span> <strong>{statusResult.admission_number}</strong></div>
                )}
                {statusResult.rejection_reason && (
                  <Alert variant="destructive"><AlertDescription>{statusResult.rejection_reason}</AlertDescription></Alert>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusCheck(false)}>Close</Button>
            <Button onClick={() => statusCheckMutation.mutate()} disabled={!statusId}>Check Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
