const crypto = require('crypto');
const fs = require('fs');
const mime = require('mime');
const path = require('path');

function createHash(file, hashingAlgorithm) {
    return crypto.createHash(hashingAlgorithm).update(file).digest('hex');
}

exports.createHash = createHash

exports.convertToDictionaryItemsRepresentation = function convertToDictionaryItemsRepresentation(obj) {
    return new Map(
        Object.entries(obj).map(([k, v]) => {
            return [k, [v, new Map()]];
        })
    );
}

exports.signRSASHA256 = function signRSASHA256(data, privateKey) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data, 'utf8');
    sign.end();
    return sign.sign(privateKey, 'base64');
}

exports.getPrivateKeyAsync = async function getPrivateKeyAsync() {
    const privateKeyPath = process.env.PRIVATE_KEY_PATH;
    if (!privateKeyPath) {
        return null;
    }

    const pemBuffer = fs.readFileSync(path.resolve(privateKeyPath));
    return pemBuffer.toString('utf8');
}

exports.getAssetMetadataSync = function getAssetMetadataSync({
                                                                 updateBundlePath,
                                                                 filePath,
                                                                 ext,
                                                                 isLaunchAsset,
                                                                 runtimeVersion,
                                                                 platform,
                                                             }) {
    const assetFilePath = `${updateBundlePath}/${filePath}`;
    const asset = fs.readFileSync(path.resolve("public/" + assetFilePath), null);
    const assetHash = createHash(asset, 'sha256');
    const keyHash = createHash(asset, 'md5');
    const keyExtensionSuffix = isLaunchAsset ? 'bundle' : ext;
    const contentType = isLaunchAsset ? 'application/javascript' : mime.getType(ext);

    return {
        hash: assetHash,
        key: keyHash,
        fileExtension: `.${keyExtensionSuffix}`,
        contentType,
        // url: `http://10.0.2.2:3000/api/assets?asset=${assetFilePath}&runtimeVersion=${runtimeVersion}&platform=${platform}`,
        url: `http://192.168.31.35:3000/api/assets?asset=${assetFilePath}&runtimeVersion=${runtimeVersion}&platform=${platform}`,
    };
}

exports.getMetadataSync = function getMetadataSync({updateBundlePath, runtimeVersion}) {
    try {
        const metadataPath = `public/${updateBundlePath}/metadata.json`;
        const updateMetadataBuffer = fs.readFileSync(path.resolve(metadataPath), null);
        const metadataJson = JSON.parse(updateMetadataBuffer.toString('utf-8'));
        const metadataStat = fs.statSync(metadataPath);

        return {
            metadataJson,
            createdAt: new Date().toISOString(),
            id: createHash(updateMetadataBuffer, 'sha256'),
        };
    } catch (error) {
        throw new Error(`No update found with runtime version: ${runtimeVersion}. Error: ${error}`);
    }
}

exports.convertSHA256HashToUUID = function convertSHA256HashToUUID(value) {
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(
        16,
        20
    )}-${value.slice(20, 32)}`;
}
