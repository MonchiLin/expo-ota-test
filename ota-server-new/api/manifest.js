const FormData = require('form-data');
const { serializeDictionary } = require('structured-headers');

const {
  getAssetMetadataSync,
  getMetadataSync,
  convertSHA256HashToUUID,
  convertToDictionaryItemsRepresentation,
  signRSASHA256,
  getPrivateKeyAsync,
} = require('../common/helpers');

module.exports = async function manifestEndpoint(req, res) {
  console.log("获取清单", req.url)
  const platform = req.headers['expo-platform'] ?? req.query['platform'];
  const runtimeVersion = req.headers['expo-runtime-version'] ?? req.query['runtime-version'];
  const updateBundlePath = `updates/${runtimeVersion}`;

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.json({ error: 'Expected GET.' });
    return;
  }

  if (platform !== 'ios' && platform !== 'android') {
    res.statusCode = 400;
    res.json({
      error: 'Unsupported platform. Expected either ios or android.',
    });
    return;
  }

  try {
    const { metadataJson, createdAt, id } = getMetadataSync({
      updateBundlePath,
      runtimeVersion,
    });
    const platformSpecificMetadata = metadataJson.fileMetadata[platform];
    const manifest = {
      id: convertSHA256HashToUUID(id),
      createdAt,
      runtimeVersion,
      assets: platformSpecificMetadata.assets.map((asset) =>
        getAssetMetadataSync({
          updateBundlePath,
          filePath: asset.path,
          ext: asset.ext,
          runtimeVersion,
          platform,
          isLaunchAsset: false,
        })
      ),
      launchAsset: getAssetMetadataSync({
        updateBundlePath,
        filePath: platformSpecificMetadata.bundle,
        isLaunchAsset: true,
        runtimeVersion,
        platform,
        ext: null,
      }),
    };

    let signature = null;
    const expectSignatureHeader = req.headers['expo-expect-signature'];
    if (expectSignatureHeader) {
      const privateKey = await getPrivateKeyAsync();
      if (privateKey) {
        const manifestString = JSON.stringify(manifest);
        const hashSignature = signRSASHA256(manifestString, privateKey);
        const dictionary = convertToDictionaryItemsRepresentation({ sig: hashSignature });
        signature = serializeDictionary(dictionary);
      }
    }

    const assetRequestHeaders = {};
    [...manifest.assets, manifest.launchAsset].forEach((asset) => {
      assetRequestHeaders[asset.key] = {
        'test-header': 'test-header-value',
      };
    });

    const form = new FormData();
    form.append('manifest', JSON.stringify(manifest), {
      contentType: 'application/json',
      header: {
        'content-type': 'application/json; charset=utf-8',
        ...(signature ? { 'expo-signature': signature } : {}),
      },
    });
    form.append('extensions', JSON.stringify({ assetRequestHeaders }), {
      contentType: 'application/json',
    });

    res.statusCode = 200;
    res.setHeader('expo-protocol-version', 0);
    res.setHeader('expo-sfv-version', 0);
    res.setHeader('cache-control', 'private, max-age=0');
    res.setHeader('content-type', `multipart/mixed; boundary=${form.getBoundary()}`);
    res.write(form.getBuffer());
    res.end();
  } catch (error) {
    console.error(error);
    res.statusCode = 404;
    res.json({ error });
  }
}
