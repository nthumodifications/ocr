import { json, error } from '@sveltejs/kit'
import { createWorker } from 'tesseract.js'

export const GET = async ({ url }) => {

  let imgUrl = url.searchParams.get('url');

  try {
    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789',
    })

    const result = await worker.recognize(imgUrl);
    await worker.terminate();

    return new json({
      result: result.data.text.replace('\n', '')
    });
  }

  catch {
    throw error(400, 'Sum ting wong')
  }

  throw error(400, 'Sum ting wong')

}