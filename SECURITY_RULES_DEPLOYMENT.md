# Firebase Security Rules Deployment Guide

## Overview

This project uses Firebase Security Rules to protect user data. Rules are defined in:
- `firestore.rules` - Firestore database security rules
- `storage.rules` - Firebase Storage security rules

## Current Deployment Status

### Staging Environment (`lingoleap---staging`)
- ✅ **Firestore Rules:** Deployed successfully (2026-01-05)
- ⚠️ **Storage Rules:** Pending - Storage not yet initialized

### Production Environment (`lingoleap-56ead`)
- ⏳ **Firestore Rules:** Not yet deployed
- ⏳ **Storage Rules:** Not yet deployed

---

## Deploying Security Rules

### Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Authenticated: `firebase login`
3. Project configured in `.firebaserc`

### Deploy to Staging
```bash
# Deploy Firestore rules only
firebase deploy --only firestore:rules --project staging

# Deploy Storage rules (after Storage is initialized)
firebase deploy --only storage:rules --project staging

# Deploy both
firebase deploy --only firestore:rules,storage:rules --project staging
```

### Deploy to Production
```bash
# Deploy Firestore rules only
firebase deploy --only firestore:rules --project production

# Deploy Storage rules (after Storage is initialized)
firebase deploy --only storage:rules --project production

# Deploy both
firebase deploy --only firestore:rules,storage:rules --project production
```

---

## Initial Setup Required

### Firebase Storage Setup

Before you can deploy Storage rules or use Storage features, you must initialize Firebase Storage in the Firebase Console:

1. **Staging:**
   - Visit: https://console.firebase.google.com/project/lingoleap---staging/storage
   - Click "Get Started"
   - Choose "Start in production mode" (we'll override with our secure rules)
   - Select a Cloud Storage location (recommend: `us-central1` or closest to your users)
   - Click "Done"

2. **Production:**
   - Visit: https://console.firebase.google.com/project/lingoleap-56ead/storage
   - Repeat the same steps as staging

3. **After Storage is initialized, deploy the rules:**
   ```bash
   firebase deploy --only storage:rules --project staging
   firebase deploy --only storage:rules --project production
   ```

---

## Security Rules Overview

### Firestore Rules (`firestore.rules`)

**Core Principles:**
- Deny all by default (fail closed)
- Users can only access their own data
- Per-user data scoping enforced
- Public content (lessons, courses) is read-only for authenticated users

**Protected Collections:**
- `/users/{userId}` - User profiles (read/write by owner only)
- `/progress/{userId}` - Learning progress (owner only)
- `/achievements/{userId}` - User achievements (owner only)
- `/notes/{noteId}` - User notes (owner only via userId field)
- `/lessons/{lessonId}` - Public lessons (read-only, write via Admin SDK)
- `/courses/{courseId}` - Public courses (read-only, write via Admin SDK)

### Storage Rules (`storage.rules`)

**Core Principles:**
- Deny all by default (fail closed)
- User files scoped to user ID
- File size limits enforced
- File type validation (images, audio)

**Protected Paths:**
- `/users/{userId}/profile/` - Profile pictures (max 5MB, images only)
- `/users/{userId}/audio/` - Audio recordings (max 10MB, audio only, owner only)
- `/users/{userId}/files/` - Private user files (max 20MB, owner only)
- `/content/` - Public content (read-only, write via Admin SDK)
- `/public/` - Public assets (read by everyone)

---

## Testing Security Rules

### Local Testing with Firebase Emulator

1. **Install emulator:**
   ```bash
   firebase emulators:start --only firestore,storage
   ```

2. **Run tests against emulator:**
   - Rules are loaded automatically from `firestore.rules` and `storage.rules`
   - Update Firebase SDK to use emulator in development

3. **Emulator UI:**
   - Access at http://localhost:4000
   - View and test rules interactively

### Manual Testing in Console

1. **Firestore Rules Playground:**
   - Go to Firestore > Rules tab
   - Click "Rules Playground"
   - Test read/write operations with different auth states

2. **Storage Rules Simulator:**
   - Go to Storage > Rules tab
   - Click "Simulate read/write"
   - Test with different file types and sizes

---

## Rules Update Workflow

1. **Make changes to rules files:**
   - Edit `firestore.rules` or `storage.rules`
   - Test locally with Firebase Emulator

2. **Deploy to staging first:**
   ```bash
   firebase deploy --only firestore:rules,storage:rules --project staging
   ```

3. **Test in staging environment:**
   - Run integration tests
   - Verify access controls work as expected

4. **Deploy to production:**
   ```bash
   firebase deploy --only firestore:rules,storage:rules --project production
   ```

5. **Commit changes:**
   ```bash
   git add firestore.rules storage.rules
   git commit -m "Update Firebase security rules"
   ```

---

## Common Errors and Solutions

### Error: "Firebase Storage has not been set up"
**Solution:** Initialize Storage in Firebase Console (see "Initial Setup Required" above)

### Error: "Permission denied"
**Cause:** User doesn't own the resource or isn't authenticated
**Solution:** Check that `request.auth.uid` matches resource owner

### Error: "File too large"
**Cause:** File exceeds size limit in storage.rules
**Solution:** Increase size limit or reject upload client-side

### Error: "Invalid file type"
**Cause:** File type doesn't match allowed types (e.g., uploading PDF to image path)
**Solution:** Check client-side validation before upload

---

## Security Checklist

Before deploying to production:

- [ ] ✅ Firestore rules deny all by default
- [ ] ✅ Per-user data scoping enforced
- [ ] ✅ Storage rules deny all by default
- [ ] ✅ File size limits enforced
- [ ] ✅ File type validation implemented
- [ ] ⚠️ Storage initialized in Firebase Console
- [ ] ⏳ Rules tested with Firebase Emulator
- [ ] ⏳ Integration tests pass in staging
- [ ] ⏳ Rules deployed to production

---

## References

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules Documentation](https://firebase.google.com/docs/storage/security/start)
- [Firebase Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)
