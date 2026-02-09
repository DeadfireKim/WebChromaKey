export enum ChromaKeyErrorCode {
  CAMERA_ACCESS_DENIED = 'CAMERA_ACCESS_DENIED',
  CAMERA_NOT_FOUND = 'CAMERA_NOT_FOUND',
  CAMERA_IN_USE = 'CAMERA_IN_USE',
  SEGMENTATION_MODEL_LOAD_FAILED = 'SEGMENTATION_MODEL_LOAD_FAILED',
  SEGMENTATION_FAILED = 'SEGMENTATION_FAILED',
  INVALID_BACKGROUND_IMAGE = 'INVALID_BACKGROUND_IMAGE',
  CANVAS_NOT_INITIALIZED = 'CANVAS_NOT_INITIALIZED',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
}

export class ChromaKeyError extends Error {
  constructor(
    public code: ChromaKeyErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ChromaKeyError';
    Object.setPrototypeOf(this, ChromaKeyError.prototype);
  }

  static cameraAccessDenied(details?: any): ChromaKeyError {
    return new ChromaKeyError(
      ChromaKeyErrorCode.CAMERA_ACCESS_DENIED,
      '카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.',
      details
    );
  }

  static cameraNotFound(details?: any): ChromaKeyError {
    return new ChromaKeyError(
      ChromaKeyErrorCode.CAMERA_NOT_FOUND,
      '사용 가능한 카메라를 찾을 수 없습니다.',
      details
    );
  }

  static cameraInUse(details?: any): ChromaKeyError {
    return new ChromaKeyError(
      ChromaKeyErrorCode.CAMERA_IN_USE,
      '카메라가 이미 다른 애플리케이션에서 사용 중입니다.',
      details
    );
  }
}
