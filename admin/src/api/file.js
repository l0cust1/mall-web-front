import request from '@/utils/request'

/**
 * 上传文件
 * @param {FormData} formData
 */
export function uploadFile(formData) {
  return request({
    url: '/file/upload',
    method: 'post',
    data:formData

  })
}

export function deleteFile(params) {
  return request({
    url: '/file/delete',
    method: 'delete',
    params
  })
}
