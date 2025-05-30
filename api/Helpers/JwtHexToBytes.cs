namespace api.Helpers;

//Convert the jwt key Hex string into an array of bytes
public static class JwtHexToBytes
{
    public static byte[] FromHexToBytes(string hexString)
    {
        //Create byte array
        var byteArray = new byte[hexString.Length / 2];

        for (var i = 0; i < hexString.Length; i += 2)
        {
            byteArray[i / 2] = Convert.ToByte(hexString.Substring(i, 2), 16);
        }
        return byteArray;
    }

}