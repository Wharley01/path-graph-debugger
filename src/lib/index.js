import axios from "axios";
export class Response {
  constructor(res = {
    data: null,
    msg: "",
    status: 0
  }) {
    this.raw_response = res;
  }
  getData() {
    if (typeof this.raw_response['data'] !== 'undefined') {
      return this.raw_response.data;
    } else {
      return null
    }
  }


  getMsg() {
    if (typeof this.raw_response.msg !== 'undefined') {
      return this.raw_response.msg;
    } else {
      return null;
    }
  }

  getNetworkErrorMsg() {
    if (typeof this.raw_response['network_msg'] !== 'undefined') {
      return this.raw_response.network_msg;
    } else {
      return null;
    }
  }


  getStatus() {
    if (typeof this.raw_response.status !== 'undefined') {
      return this.raw_response.status;
    } else {
      return 0;
    }
  }

  getTotalPages() {
    if (typeof this.raw_response.current_page !== 'undefined') {
      return this.raw_response.current_page;
    } else {
      return 1;
    }
  }

  getCurrentPage() {
    if (typeof this.raw_response.current_page !== 'undefined') {
      return this.raw_response.current_page;
    } else {
      return 1;
    }
  }

}
export default function Graph(root_path = '/path-graph') {
  this.endpoint = root_path;
  this.auto_link = false;
  this.axiosConfig = {}
  this.queryTree = {
    service_name: null,
    service_method: 'getAll',
    columns: [],
    alias: null,
    id: null,
    page: 1,
    params: {},
    queries: {},
    filters: {},
    post_params: {},

  };

  this.AutoLink = function () {
    this.auto_link = true;
    return this;
  }

  this.Service = function (service) {
    this.queryTree.service_name = service;
    return this;
  }

  this.Where = function (conditions) {
    this.queryTree.filters = {
      ...this.queryTree.filters,
      ...conditions
    }
    return this;
  }

  this.Ref = function (id) {
    this.queryTree.filters = {
      ...this.queryTree.filters,
      ...{
        id
      }
    }
    return this;
  }

  this.Page = function (page) {
    if (isNaN(page)) {
      throw new Error('Page must be a valid number');
    }
    this.queryTree.page = parseInt(page);
    return this;
  }

  Graph.Column = function (column) {
    if (/[^\w_]/.test(column)) {
      throw new Error('Invalid column name');
    }
    return {
      name: column,
      type: 'column',
      tree: null
    }
  };

  Graph.Col = function (column) {
    return Graph.Column(column)
  };
  this.fetchOne = function (...columns) {
    this.queryTree.service_method = "getOne";
    columns = columns.map(column => typeof column == 'string' ? Graph.Column(column) : column);
    this.queryTree.columns = [
      ...this.queryTree.columns,
      ...columns
    ];
    return this;
  }
  this.fetchAll = function (...columns) {
    this.queryTree.service_method = "getAll";
    columns = columns.map(column => typeof column == 'string' ? Graph.Column(column) : column);
    this.queryTree.columns = [
      ...this.queryTree.columns,
      ...columns
    ];
    return this;
  }
  this.Func = function (func) {

    if (!func)
      throw new Error("Specify fetch method");

    this.queryTree.service_method = func;
    return this;
  };

  this.Fetch = function (...columns) {
    this.queryTree.columns = [
      ...this.queryTree.columns,
      ...columns
    ];
    return this;
  }
  this.As = function (alias) {
    this.queryTree.alias = alias;
    let struct = {
      name: alias,
      type: 'instance',
      method: this.queryTree.service_method,
      service: this.queryTree.service_name,
      page: this.queryTree.page,
      columns: this.queryTree.columns,
      params: this.queryTree.params,
      queries: this.queryTree.queries,
      filters: this.queryTree.filters,
      post_params: this.queryTree.post_params,
      tree: this.queryTree
    };
    console.log({struct})
    return struct
  }



  let paramsToStr = function (params) {
    return JSON.stringify(params)
  }


  /**
   * @return {string}
   */
  let ColumnToStr = function (root, columns) {
    let str = "";
    if (columns.length) {
      for (let index in columns) {
        let column = columns[index];
        //  generate params
        if (column.type === "column") {
          str += '&' + root + `[${column.name}][type]=column`
        } else if (column.type === "instance") {
          str += `&${root}[${column.name}][type]=service`;
          str += `&${root}[${column.name}][func]=${column.method}`;
          str += `&${root}[${column.name}][service]=${column.service}`;
          str += `&${root}[${column.name}][page]=${column.page}`;
          str += `&${root}[${column.name}][filters]=${paramsToStr(column.filters)}`;
          str += `&${root}[${column.name}][params]=${paramsToStr(column.params)}`;
          str += ColumnToStr(`${root}[${column.name}][columns]`, column.columns)
        }
        //${treeToStr(column.tree)}
      }
    }

    return str;
  };

  let treeToStr = function (queryTree, root = null) {
    let query = "";
    let _root = "";
    query += `${queryTree.service_name}[func]=${queryTree.service_method}`;
    query += `&${queryTree.service_name}[service]=${queryTree.service_name}`;
    query += `&${queryTree.service_name}[type]=service`;
    query += `&${queryTree.service_name}[page]=${queryTree.page}`;
    query += `&${queryTree.service_name}[params]=${paramsToStr(queryTree.params)}`;
    query += `&${queryTree.service_name}[filters]=${paramsToStr(queryTree.filters)}`;
    _root = `${queryTree.service_name}[columns]`;
    query += ColumnToStr(_root, queryTree.columns);

    return query;
  };

  this.toLink = function () {
    // console.log(JSON.stringify(this.queryTree))
    if (!this.queryTree.service_name)
      throw new Error("Service not specified");

    return treeToStr(this.queryTree, null);
  };

  this.setAxiosConfig = function (config) {
    this.axiosConfig = config;
  };

  let makeRequest = function (endpoint, params, axiosConfig) {
    const req = axios.create(axiosConfig);

    return new Promise(async (resolve, reject) => {
      try {
        let res = await req.post(endpoint, params);
        res = res.data;
        resolve(new Response(res))
      } catch (e) {
        console.log({
          e
        });
        let res = {
          data: null,
          msg: "",
          status: 0
        };
        res = {
          ...res,
          network_msg: e.message
        };
        if (typeof e.response !== 'undefined') {
          res = {
            ...res
          }
          //            status: e.response.status,
          if (typeof e.response.status !== 'undefined') {
            res['status'] = e.response.status;
          }
          if (typeof e.response.data !== 'undefined') {
            res = {
              ...res,
              ...e.response.data
            }
          }
        }
        reject(new Response(res))
      }
    });
  }
  this.get = async function () {
    return makeRequest(this.endpoint, {
      _____graph: this.toLink(),
      _____method: "GET",
      ...(this.auto_link && {
        _____auto_link: "yes"
      })
    }, this.axiosConfig)
  };

  this.delete = async function () {
    return makeRequest(this.endpoint, {
      _____graph: this.toLink(),
      _____method: "DELETE",
      ...(this.auto_link && {
        _____auto_link: "yes"
      })
    }, this.axiosConfig)
  };

  this.set = async function (values = {}) {
    this.queryTree.post_params = {
      ...this.queryTree.post_params,
      ...values
    };

    return makeRequest(this.endpoint, {
      _____graph: this.toLink(),
      _____method: "POST",
      ...this.queryTree.post_params,
      ...(this.auto_link && {
        _____auto_link: "yes"
      })
    }, this.axiosConfig)

  };

  this.update = async function (values = {}) {
    this.queryTree.post_params = {
      ...this.queryTree.post_params,
      ...values
    };

    return makeRequest(this.endpoint, {
      _____graph: this.toLink(),
      _____method: "PATCH",
      ...this.queryTree.post_params,
      ...(this.auto_link && {
        _____auto_link: "yes"
      })
    }, this.axiosConfig)

  };


  this.SetParams = function (params) {
    this.queryTree.params = {
      ...this.queryTree.params,
      ...params
    };
    return this;
  };

}

export {
  Graph
}
