# Cloud Run Security Checklist

## Action Required: Verify IAM Permissions

Run these commands to ensure your Cloud Run service is properly secured:

### 1. Check Current IAM Policy

```bash
gcloud run services get-iam-policy korean-analysis \
  --region=us-central1 \
  --format=json
```

### 2. Remove Public Access (if present)

```bash
# Remove allUsers access
gcloud run services remove-iam-policy-binding korean-analysis \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### 3. Grant Access Only to Firebase Functions

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant invoker role to Firebase Functions service account
gcloud run services add-iam-policy-binding korean-analysis \
  --region=us-central1 \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 4. Verify Configuration

```bash
# Should show ONLY your Firebase Functions service account
gcloud run services get-iam-policy korean-analysis \
  --region=us-central1 \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/run.invoker" \
  --format="table(bindings.members)"
```

Expected output should ONLY show:
```
MEMBERS
serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com
```

If you see `allUsers` or `allAuthenticatedUsers`, remove them immediately.

### 5. Test Access

After configuring, test that:
- ✅ Firebase Functions can call the service
- ❌ Direct HTTP requests to the service URL fail with 403 Forbidden

```bash
# This should return 403 Forbidden (good!)
curl https://korean-analysis-XXXX-uc.a.run.app/analyze
```

---

## What This Protects Against

- **Public Access**: Prevents anyone from calling your analysis service directly
- **Resource Exhaustion**: Only your Firebase Functions can trigger analysis
- **Cost Control**: Prevents unauthorized usage that could rack up bills
- **Data Integrity**: Ensures only validated requests reach the service

---

## Status

- [ ] IAM policy verified
- [ ] Public access removed
- [ ] Firebase Functions service account granted access
- [ ] Direct access test returns 403

Mark items as completed after verification.
