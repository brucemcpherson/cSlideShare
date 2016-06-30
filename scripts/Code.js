/**
* use the slideshare API
*/
var SlideShare = function () {
  
  var apiKey_,userName_,password_,secret_;
  var self = this;

  
  /**
  * set the api key
  * @param {string} the apiKey
  * @return {SlideShare} self
  */
  self.setApiKey = function (apiKey) {
    apiKey_ = apiKey;
    return self;
  };
  
  /**
  * set user name
  * @param {string} userName as string
  * @return {SlideShare} self
  */
  self.setUserName = function (userName) {
    userName_ = userName;
    return self;
  };
  
  /**
  * set user name
  * @param {string} password as string
  * @return {SlideShare} self
  */
  self.setPassword = function (password) {
    password_ = password;
    return self;
  };
  
  /**
  * set shared secret
  * @param {string} secret as string
  * @return {SlideShare} self
  */
  self.setSecret = function (secret) {
    secret_ = secret;
    return self;
  };
  
  function getBaseUrl_  () {
    return "https://www.slideshare.net/api/2/";
  }
  
  /**
  * get all the shows belonging to a user
  * @param {string} [user=] default is to use the set user name
  * @param {booleam} [detailed=false] whether to get detailed info
  * @return {object] the result
  */
  self.getSlideshowsByUserName = function (user,detailed) {
    return urlExecute_ ( "get_slideshows_by_user",["username_for="+(user || userName_),"detailed=" + (detailed ? 1 : 0 )]);
  };
  
  /**
  * get slideshow bt its id
  * @param {string} id the id
  * @param {booleam} [detailed=false] whether to get detailed info
  * @return {object] the result
  */
  self.getSlideshow = function (id, detailed) {
    return urlExecute_ ( "get_slideshow",["slideshow_id=" + id,"detailed=" + (detailed ? 1 : 0 )]);
  };
  
  
  /**
  * execute a API request
  * @param {string} urlTail the url appendage
  * @param {[string]} [params] the params
  * @param {string} [options] any options to be merged in
  * @return {object} a standard response object
  */
  function urlExecute_ ( urlTail , params , options) {
    
    // set default options
    options = cUseful.Utils.vanMerge ([{
      method:"GET",
      muteHttpExceptions:true
    }, options]);

    
    // the api key etc.
    var ts = Math.round(new Date().getTime()/1000);
    paramString = "?" + [
      "api_key="+apiKey_, 
      "ts=" + ts , 
      "hash=" + cUseful.makeSha1Hex(secret_+ts)
    ].concat(params || []).join("&");
    
    var u = getBaseUrl_ () + urlTail + paramString;
    
    var response = cUseful.Utils.expBackoff( function () {
      return UrlFetchApp.fetch(u, options);
    });
    
    // trnsmit what happened
    if (response.getResponseCode() !== 200) {
      
      return {
        response:response, 
        success:false,
        err:response.getContentText()
      }
    }
    else {
      try {
        
        var ob = makeObFromXml(XmlService.parse (response.getContentText()).getRootElement());
        
        return{
          response:response,
          data:ob,
          success:!ob.error,
          err:ob.error
        }; 
        
        
      }
      catch (err) {
        return {
          response:response,
          success:false,
          err:err
        }
      }
    }
  };
  
  /**
  * traverse an xml tree and create a js object
  * @param {XmlElement} xmlElement the parent
  * @return {object||string} a new branch
  */
  function makeObFromXml(xmlElement) {
    
    // parent for this iteration
    var job = {};
    var name = xmlElement.getName();
    
    // attributes are converted to children
    xmlElement.getAttributes().forEach(function(d) {
      var child = XmlService.createElement(d.getName());
      child.setText(d.getValue());
      xmlElement.addContent(child);
    });
    
    
    // any children
    var kids = xmlElement.getChildren();
    if (!kids.length) {
      // its just a value
      return fixValue(xmlElement.getText());
    } 
    
    else {
      
      // if there are any children we need to recurse
      kids.forEach (function(d) {
        store ( job , d.getName() , makeObFromXml(d));
      });
      
      // if there is also a text node, we need to add that too, but also create a node for it
      store (job , 'text' ,  fixValue(xmlElement.getText()));
      
    }
    return job;
    
    function store( job , name , value ) {
      
      
      // if it's a repeated key, then we need to turn into an array
      if (job.hasOwnProperty(name) && !Array.isArray (job[name])) {
        job[name] = [job[name]];
      }
      
      // push or assign
      if (value !== '') {
        if (Array.isArray (job[name])) {
          job[name].push (value);
        }
        else {
          job[name] = value;
        }
      }
      
    }
    
    /**
    * converts strings from xml back to regular types
    * @param {string} value the string value
    * @param {*} a native type
    */
    function fixValue (value) {
      
      // is it truthy/falsely
      var lowerValue = value.toLowerCase().trim();
      
      if (lowerValue === false.toString()) return false;
      if (lowerValue === true.toString()) return true;
      
      // is it a number
      if (isFinite(lowerValue) && lowerValue !== '') return new Number (lowerValue);
      
      // just leave it untouched but trimmed
      return value.trim();
    }
    
  }
  
  
};
