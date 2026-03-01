# Receipt Storage Service Usage Guide

## Overview

The `ReceiptStorageService` handles uploading, compressing, and deleting receipt images in Supabase Storage. It automatically compresses images before upload to reduce storage costs and improve performance.

## Features

- **Automatic Image Compression**: Resizes images to max 800px width while maintaining aspect ratio
- **Supabase Storage Integration**: Uploads to the `receipts` bucket with proper path structure
- **Unique Filenames**: Generates unique filenames with timestamps to prevent collisions
- **Error Handling**: Graceful error handling with detailed error messages
- **Cleanup Support**: Deletes receipt images when expenses are deleted

## Basic Usage

### Upload Receipt Image

```typescript
import { receiptStorageService } from './services/ReceiptStorageService';

// Upload a receipt image
const imageBlob = /* ... get image blob from camera or file input ... */;
const householdId = 'household-uuid';
const expenseId = 'expense-uuid';

try {
  const receiptUrl = await receiptStorageService.uploadReceipt(
    imageBlob,
    householdId,
    expenseId
  );
  
  console.log('Receipt uploaded:', receiptUrl);
  // Store receiptUrl in expense record
} catch (error) {
  console.error('Failed to upload receipt:', error);
}
```

### Delete Receipt Image

```typescript
import { receiptStorageService } from './services/ReceiptStorageService';

// Delete a receipt image
const receiptUrl = 'https://...supabase.co/storage/v1/object/public/receipts/...';

try {
  await receiptStorageService.deleteReceipt(receiptUrl);
  console.log('Receipt deleted successfully');
} catch (error) {
  console.error('Failed to delete receipt:', error);
  // Note: Deletion failures are logged but don't throw errors
}
```

### Compress Image Manually

```typescript
import { receiptStorageService } from './services/ReceiptStorageService';

// Compress an image without uploading
const imageBlob = /* ... get image blob ... */;

try {
  const compressedBlob = await receiptStorageService.compressImage(imageBlob, 800);
  console.log('Image compressed:', compressedBlob.size, 'bytes');
} catch (error) {
  console.error('Failed to compress image:', error);
}
```

## Integration with OCR Service

The OCR service provides a convenient wrapper for uploading receipt images:

```typescript
import { ocrService } from './services/OCRService';

// Process receipt and upload image
const imageBlob = /* ... get image blob ... */;
const householdId = 'household-uuid';
const expenseId = 'expense-uuid';

try {
  // Process receipt with OCR
  const ocrResult = await ocrService.processReceipt(imageBlob);
  
  // Upload the receipt image
  const receiptUrl = await ocrService.uploadReceiptImage(
    imageBlob,
    householdId,
    expenseId
  );
  
  console.log('OCR result:', ocrResult);
  console.log('Receipt URL:', receiptUrl);
} catch (error) {
  console.error('Failed to process receipt:', error);
}
```

## Integration with Expense Service

The expense service automatically handles receipt deletion when an expense is deleted:

```typescript
import { expenseService } from './services/ExpenseService';

// Delete expense (automatically deletes receipt if exists)
const expenseId = 'expense-uuid';

try {
  await expenseService.deleteExpense(expenseId);
  console.log('Expense and receipt deleted');
} catch (error) {
  console.error('Failed to delete expense:', error);
}
```

## Storage Path Structure

Receipt images are stored in Supabase Storage with the following path structure:

```
receipts/
  {household_id}/
    {expense_id}/
      {expense_id}_{timestamp}.jpg
```

Example:
```
receipts/
  550e8400-e29b-41d4-a716-446655440000/
    660e8400-e29b-41d4-a716-446655440001/
      660e8400-e29b-41d4-a716-446655440001_1709251234567.jpg
```

This structure:
- Organizes receipts by household for easy management
- Groups receipts by expense for quick lookup
- Uses unique filenames to prevent collisions
- Allows for multiple receipts per expense (future enhancement)

## Image Compression

The service automatically compresses images before upload:

- **Max Width**: 800px (configurable)
- **Aspect Ratio**: Maintained
- **Format**: JPEG
- **Quality**: 85% (configurable)

Example compression results:
- Original: 3.2 MB (4032x3024)
- Compressed: ~150 KB (800x600)
- Compression ratio: ~95% reduction

## Error Handling

The service provides detailed error messages for common issues:

```typescript
try {
  const receiptUrl = await receiptStorageService.uploadReceipt(
    imageBlob,
    householdId,
    expenseId
  );
} catch (error) {
  if (error instanceof Error) {
    // Possible error messages:
    // - "Household ID and Expense ID are required"
    // - "Failed to upload receipt: [Supabase error]"
    // - "Failed to compress image: [compression error]"
    console.error(error.message);
  }
}
```

## Supabase Storage Configuration

Ensure the `receipts` bucket is configured in Supabase:

1. **Bucket Settings**:
   - Name: `receipts`
   - Public: `false` (authenticated users only)
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

2. **Storage Policies**:
   - Users can upload receipts to their household folder
   - Users can view receipts in their household folder
   - Users can delete receipts in their household folder

See `supabase/storage-policies.sql` for the complete policy configuration.

## Best Practices

1. **Always compress images** before upload to reduce storage costs
2. **Store receipt URLs** in the expense record for easy retrieval
3. **Handle upload failures gracefully** - allow users to retry or skip
4. **Clean up receipts** when expenses are deleted to avoid orphaned files
5. **Validate image format** before upload (JPEG, PNG, WebP only)
6. **Set reasonable file size limits** (5 MB recommended)

## Performance Considerations

- **Compression time**: ~100-500ms for typical receipt images
- **Upload time**: ~500-2000ms depending on network speed and image size
- **Total time**: ~1-3 seconds from capture to upload complete

For better UX:
- Show loading indicator during upload
- Allow users to continue editing while upload happens in background
- Provide retry option if upload fails

## Future Enhancements

Potential improvements for the receipt storage service:

1. **Multiple receipts per expense**: Support uploading multiple receipt images
2. **Image editing**: Crop, rotate, adjust brightness/contrast before upload
3. **Thumbnail generation**: Generate thumbnails for faster loading in lists
4. **Offline support**: Queue uploads when offline, sync when online
5. **Image optimization**: Use WebP format for better compression
6. **CDN integration**: Serve images through CDN for faster loading
7. **Receipt OCR caching**: Cache OCR results to avoid reprocessing

## Troubleshooting

### Upload fails with "Failed to upload receipt"

- Check Supabase credentials in `.env` file
- Verify the `receipts` bucket exists in Supabase Storage
- Ensure storage policies are configured correctly
- Check network connection

### Image compression fails

- Verify the image blob is valid
- Check browser compatibility (Canvas API required)
- Ensure image format is supported (JPEG, PNG, WebP)

### Receipt URL not accessible

- Verify storage policies allow access for authenticated users
- Check if the user is authenticated
- Ensure the receipt URL is correctly formatted

## Related Documentation

- [OCR Service Usage](./OCR_SERVICE_USAGE.md)
- [Expense Service Usage](./EXPENSE_SERVICE_USAGE.md)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
