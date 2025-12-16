
const CLOUD_NAME = import.meta.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = import.meta.env.CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.CLOUDINARY_API_SECRET;

export class CloudinaryOptimizer {

    /**
     * Generate a single optimized URL
     */
    static url(publicId: string, options: { width?: number, quality?: string, crop?: string } = {}) {
        if (!publicId) return '';

        // If it's already a full URL (legacy or external), just return it
        if (publicId.startsWith('http') || publicId.startsWith('blob:') || publicId.startsWith('data:')) {
            return publicId;
        }

        const params = [];
        params.push('f_auto'); // Auto format (WebP/AVIF)
        
        if (options.quality) params.push(`q_${options.quality}`);
        else params.push('q_auto');      // Good balance of size/quality

        if (options.width) params.push(`w_${options.width}`);
        if (options.crop) params.push(`c_${options.crop}`);

        const transformation = params.join(',');

        return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformation}/${publicId}`;
    }

    /**
     * Upload a file to Cloudinary (Signed) using native Crypto API
     */
    static async upload(file: File): Promise<string> {
        const timestamp = Math.round((new Date()).getTime() / 1000);
        
        // Generate Signature using Native Crypto (No external dependencies)
        const paramsToSign = `timestamp=${timestamp}${API_SECRET}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(paramsToSign);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', API_KEY);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        // Return the Public ID
        return result.public_id;
    }
}
