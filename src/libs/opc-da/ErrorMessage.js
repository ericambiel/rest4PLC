import ConsoleLog from "../ConsoleLog";

export default class ErrorMessage {

  /**
  * Retorna mensagem de erro de acordo com código informado.
  * @param {String} errorCode Código do error em HexDecimal
  */
  getErrorMessage(errorCode) {
    let msgText;

    switch (errorCode) {
      case 0x80040154:
        msgText = 'opc-da.error.classnotreg';
        break;
      case 0x00000005:
        msgText = "Access denied. Username and/or password might be wrong.";
        break;
      case 0xC0040006:
        msgText = "The Items AccessRights do not allow the operation.";
        break;
      case 0xC0040004:
        msgText = "The server cannot convert the data between the specified format/ requested data type and the canonical data type.";
        break;
      case 0xC004000C:
        msgText = "Duplicate name not allowed.";
        break;
      case 0xC0040010:
        msgText = "The server's configuration file is an invalid format.";
        break;
      case 0xC0040009:
        msgText = "The filter string was not valid";
        break;
      case 0xC0040001:
        msgText = "The value of the handle is invalid. Note: a client should never pass an invalid handle to a server. If this error occurs, it is due to a programming error in the client or possibly in the server.";
        break;
      case 0xC0040008:
        msgText = "The item ID doesn't conform to the server's syntax.";
        break;
      case 0xC0040203:
        msgText = "The passed property ID is not valid for the item.";
        break;
      case 0xC0040011:
        msgText = "Requested Object (e.g. a public group) was not found.";
        break;
      case 0xC0040005:
        msgText = "The requested operation cannot be done on a public group.";
        break;
      case 0xC004000B:
        msgText = "The value was out of range.";
        break;
      case 0xC0040007:
        msgText = "The item ID is not defined in the server address space (on add or validate) or no longer exists in the server address space (for read or write).";
        break;
      case 0xC004000A:
        msgText = "The item's access path is not known to the server.";
        break;
      case 0x0004000E:
        msgText = "A value passed to WRITE was accepted but the output was clamped.";
        break;
      case 0x0004000F:
        msgText = "The operation cannot be performed because the object is being referenced.";
        break;
      case 0x0004000D:
        msgText = "The server does not support the requested data rate but will use the closest available rate.";
        break;
      case 0x00000061:
        msgText = "Clsid syntax is invalid";
        break;
      default:
        msgText = "Unknown error!";
    }
    return `${String(errorCode)} - ${msgText}`;
  }

  /**
   * Imprime mensagem de erro de acordo com código informado.
   * @param {String} errorCode Código do error em HexDecimal
   * @param {String} module Modulo de onde veio o disparo do erro.
   */
  getErrorMessageAndPrint(errorCode, module) {
    new ConsoleLog(`error:${module}`).printConsole(this.getErrorMessage(errorCode));
  }
}
