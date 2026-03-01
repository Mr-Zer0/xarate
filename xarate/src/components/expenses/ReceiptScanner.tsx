import React, { useState, useRef, useEffect } from 'react';
import { ocrService, OCRResult } from '../../services/OCRService';
import { useUIStore } from '../../stores/uiStore';

interface ReceiptScannerProps {
  onDataExtracted: (data: OCRData, imageBlob?: Blob) => void;
  onClose: () => void;
}

export interface OCRData {
  amount?: number;
  description?: string;
  date?: Date;
  confidence: number;
  rawText: string;
}

type ScannerStep = 'permission' | 'capture' | 'preview' | 'processing' | 'review';

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onDataExtracted, onClose }) => {
  const { showToast } = useUIStore();
  
  const [step, setStep] = useState<ScannerStep>('permission');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [rotation, setRotation] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Request camera permission and start camera
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('error', 'Camera API not supported in this browser');
        setPermissionDenied(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setStep('capture');
      setPermissionDenied(false);
    } catch (error) {
      console.error('Camera permission error:', error);
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        showToast('error', 'Camera permission denied. Please allow camera access to scan receipts.');
        setPermissionDenied(true);
      } else {
        showToast('error', 'Failed to access camera. Please try uploading an image instead.');
        setPermissionDenied(true);
      }
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      showToast('error', 'Failed to capture image');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImage(blob);
        const url = URL.createObjectURL(blob);
        setImagePreviewUrl(url);
        setStep('preview');
        stopCamera();
      } else {
        showToast('error', 'Failed to capture image');
      }
    }, 'image/jpeg', 0.9);
  };

  // Select image from gallery
  const selectFromGallery = async () => {
    try {
      const blob = await ocrService.selectFromGallery();
      setCapturedImage(blob);
      const url = URL.createObjectURL(blob);
      setImagePreviewUrl(url);
      setStep('preview');
      stopCamera();
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // User cancelled, do nothing
        return;
      }
      console.error('Gallery selection error:', error);
      showToast('error', 'Failed to select image from gallery');
    }
  };

  // Rotate image
  const rotateImage = async () => {
    if (!capturedImage || !canvasRef.current) return;

    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);

    try {
      const img = new Image();
      const imageUrl = URL.createObjectURL(capturedImage);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Swap dimensions for 90/270 degree rotations
      if (newRotation === 90 || newRotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rotate and draw
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((newRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          URL.revokeObjectURL(imageUrl);
          setCapturedImage(blob);
          const newUrl = URL.createObjectURL(blob);
          if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
          }
          setImagePreviewUrl(newUrl);
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Rotation error:', error);
      showToast('error', 'Failed to rotate image');
    }
  };

  // Process receipt with OCR
  const processReceipt = async () => {
    if (!capturedImage) return;

    setStep('processing');

    try {
      const result = await ocrService.processReceipt(capturedImage);
      setOcrResult(result);
      setStep('review');
    } catch (error) {
      console.error('OCR processing error:', error);
      showToast('error', 'Failed to process receipt. Please try again or enter manually.');
      setStep('preview');
    }
  };

  // Retry capture
  const retryCapture = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setCapturedImage(null);
    setImagePreviewUrl(null);
    setOcrResult(null);
    setRotation(0);
    setStep('permission');
  };

  // Use extracted data
  const useExtractedData = () => {
    if (!ocrResult) return;

    const data: OCRData = {
      amount: ocrResult.amount,
      description: ocrResult.merchant,
      date: ocrResult.date,
      confidence: ocrResult.confidence,
      rawText: ocrResult.text,
    };

    // Pass both OCR data and the original image blob
    onDataExtracted(data, capturedImage || undefined);
    onClose();
  };

  // Manual entry fallback
  const enterManually = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Scan Receipt</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close scanner"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Permission Step */}
          {step === 'permission' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              {!permissionDenied ? (
                <>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Required</h4>
                    <p className="text-gray-600">
                      We need access to your camera to scan receipts and automatically extract expense information.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={startCamera}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Allow Camera Access
                    </button>
                    <button
                      onClick={selectFromGallery}
                      className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      Upload from Gallery
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Camera Permission Denied</h4>
                    <p className="text-gray-600 mb-4">
                      Camera access was denied. You can still upload a receipt image from your gallery, or enter the expense manually.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                      <p className="text-sm text-yellow-800">
                        <strong>To enable camera access:</strong>
                      </p>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                        <li>Go to your browser settings</li>
                        <li>Find site permissions or privacy settings</li>
                        <li>Allow camera access for this site</li>
                        <li>Refresh the page and try again</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={selectFromGallery}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Upload from Gallery
                    </button>
                    <button
                      onClick={enterManually}
                      className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      Enter Manually Instead
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Capture Step */}
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  aria-label="Camera viewfinder"
                />
                
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white border-dashed rounded-lg w-4/5 h-4/5 opacity-50" />
                </div>
              </div>

              <p className="text-center text-gray-600 text-sm">
                Position the receipt within the frame and tap capture
              </p>

              <div className="flex gap-3">
                <button
                  onClick={selectFromGallery}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Upload Instead
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Capture
                </button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && imagePreviewUrl && (
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreviewUrl}
                  alt="Receipt preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={rotateImage}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                  aria-label="Rotate image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Rotate
                </button>
                <button
                  onClick={retryCapture}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Retake
                </button>
                <button
                  onClick={processReceipt}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Process Receipt
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="text-center space-y-6 py-8">
              <div className="flex justify-center">
                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Processing Receipt...</h4>
                <p className="text-gray-600">
                  Extracting expense information from your receipt. This may take a few seconds.
                </p>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && ocrResult && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Extracted Data</h4>
                
                {/* Confidence Score */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Confidence Score</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.round(ocrResult.confidence * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        ocrResult.confidence >= 0.7 ? 'bg-green-500' :
                        ocrResult.confidence >= 0.4 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${ocrResult.confidence * 100}%` }}
                    />
                  </div>
                  {ocrResult.confidence < 0.7 && (
                    <p className="text-xs text-yellow-700 mt-2">
                      Low confidence. Please review and correct the extracted data.
                    </p>
                  )}
                </div>

                {/* Extracted Fields */}
                <div className="space-y-3">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {ocrResult.amount !== undefined ? `$${ocrResult.amount.toFixed(2)}` : 'Not detected'}
                    </p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {ocrResult.merchant || 'Not detected'}
                    </p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {ocrResult.date ? ocrResult.date.toLocaleDateString() : 'Not detected'}
                    </p>
                  </div>
                </div>

                {/* Raw Text (Collapsible) */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    View raw OCR text
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                      {ocrResult.text}
                    </pre>
                  </div>
                </details>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You can review and correct the extracted data in the expense form.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={retryCapture}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Scan Again
                </button>
                <button
                  onClick={useExtractedData}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Use This Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for image manipulation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
