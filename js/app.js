function bytes32_to_UTF8(str) {
  var ret;
  try {
    ret = web3.toUtf8(str);
  } catch (err) {
    ret = str;
  }
  return ret;
}


App = {
  web3Provider: null,
  contracts: {},

  init: function () {
    return App.initWeb3();
  },

  initWeb3: function () {
    // Initialize web3 and set the provider to the testRPC.
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // set the provider you want from Web3.providers
      App.web3Provider = new web3.providers.HttpProvider('http://127.0.0.1:8545');
      web3 = new Web3(App.web3Provider);
    }
/*    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        App.loadOpMessage(false,"错误", error + "请使用支持web3.0的浏览器访问本应用！")
      } else {
        return App.initContract();
      }
    })*/
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('./Poll.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var PollArtifact = data;
      App.contracts.Poll = TruffleContract(PollArtifact);
      // Set the provider for our contract.
      App.contracts.Poll.setProvider(App.web3Provider);
      return App.loadProposals();
    });
    $.getJSON('./AdvancedCoin.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var CoinArtifact = data;
      App.contracts.Coin = TruffleContract(CoinArtifact);
      // Set the provider for our contract.
      App.contracts.Coin.setProvider(App.web3Provider);
      return App.setNewProposalTokenAddr();
    });

    return App.bindEvents();
  },

  loadOpMessage: function (status, title, desc) {
    $("#pmessage").removeClass('alert-success').removeClass('alert-danger');
    $("#pmessage").addClass(status=true?"alert-success":"alert-danger");
    $("#pmessage p").html("<strong>"+title+"</strong>"+desc);
    $("#pmessage").removeClass("d-none");
  },

  bindEvents: function () {
    $("#plist").on('click', '.pps_ui_new', App.loadNewProposal);
    $("#pnew").on('click', '.pps_new_ok', App.handleNewProposal);
    $("#pnew").on('click', '.pps_new_cancel', App.handleCancelNewProposal);
    $("#pdetail").on('click', '.pps_ui_back_list', App.handleDetailBack);
  },

  loadProposals: function () {
    var pCount = App.getProposalsLength();
    if (pCount <= 12) {
      // do NOT show pagination
      return App.loadAllProposals();
    } else {
      // TODO: handle pagination
      return App.loadAllProposals();
    }
  },

  getProposalsLength: function () {
    App.contracts.Poll.deployed().then(function (instance) {
      var pollInstance = instance;
      return pollInstance.getProposalsLength.call();
    });
  },

  setNewProposalTokenAddr: function () {
    App.contracts.Coin.deployed().then(function (instance) {
      var coinInstance = instance;
      console.log(coinInstance.address);
      $('#new_token_addr').val(coinInstance.address);
      return;
    });
  },

  loadNewProposal: function () {
    $("#plist").addClass('d-none');
    $("#pnew").removeClass('d-none');
  },

  handleCancelNewProposal: function (event) {
    event.preventDefault();
    $("#pnew").addClass('d-none');
    $("#plist").removeClass('d-none');
  },

  handleNewProposal: function (event) {
    event.preventDefault();
    var pname = $('#new_name').val();
    var ptoken = $('#new_token_addr').val();
    var prefer = $('#new_refer').val();
    var pthreshold = parseInt($('#new_threshold').val());
    var pdeadline = parseInt(Date.parse($('#new_deadline').val())/1000);
    var pollInstance;
    // TODO: deal error with accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.Poll.deployed().then(function (instance) {
        pollInstance = instance;
        return pollInstance.createProposal(pname, ptoken, prefer, pthreshold, pdeadline, {from: account});
      }).then(function (retId) {
        // set success messagebox
        console.log("new proposal id =" + retId);
      }).catch(function (err) {
        // set error messagebox
        console.log(err.message);
      });
    });
    // display message box
    App.loadOpMessage(true, "执行成功", "成功写入一个区块后，刷新页面即可看到更新后的内容!");
//    $("#pmessage").removeClass('d-none');
    // load proposal list UI
    $("#pnew").addClass('d-none');
    App.loadProposals();
  },

  loadProposalDetailById: function (pId) {
//    console.log("proposal id = " + pId);
    // TODO: deal error with accounts
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      var pclose = false;
      App.contracts.Coin.deployed().then(function (instance) {
        var coinIst = instance;
        return coinIst.balanceOf.call(account);
      }).then(function (balance) {
        var pdetail = $('#pdetail');
        pdetail.find('span.pps_balance').text(balance);
      }).then(function () {
        App.contracts.Poll.deployed().then(function (instance) {
          var pollInstance = instance;
          return pollInstance.getProposal.call(pId);
        }).then(function (proposal) {
          var pdetail = $('#pdetail');
          /* _p.id,_p.name,_p.reference,_p.owner,_p.voteCount,_p.tokenAddr,_p.totalToken,_p.threshold,_p.deadline,_p.paused,_p.closed */
          if ((new Date()).getTime() > proposal[8]*1000) {pclose = true;}
          if (proposal[10] == true) {pclose = true;}
          if (pclose == true) {
            $('#pps_going').addClass('d-none');
            $('#pps_closed').removeClass('d-none');
          } else {
            $('#pps_going').removeClass('d-none');
            $('#pps_closed').addClass('d-none');
          }
          pdetail.find('span.pps_id').text(proposal[0]);
          pdetail.find('span.pps_name').text(bytes32_to_UTF8(proposal[1]));
          pdetail.find('span.pps_owner').text(proposal[3]);
          pdetail.find('span.pps_refer').text(bytes32_to_UTF8(proposal[2]));
          pdetail.find('span.pps_vote_amount').text(proposal[4]);
          pdetail.find('span.pps_token_addr').text(proposal[5]);
          pdetail.find('span.pps_token_amount').text(proposal[6]);
          pdetail.find('span.pps_threshold').text(proposal[7]);
          pdetail.find('span.pps_deadline').text((new Date(proposal[8]*1000)).toLocaleString());
          var progress = 100;
          if (parseInt(proposal[4]) < parseInt(proposal[7])) {
            progress = parseInt((proposal[4]*100)/proposal[7]);
          }
          pdetail.find('div.progress-bar').text(progress+"%");
          pdetail.find('div.progress-bar').attr('aria-valuenow', progress+"%");
          pdetail.find('div.progress-bar').css('width',progress+"%");
          $("#pdetail").removeClass('d-none');
          $("#plist").addClass('d-none');
        });
      }).then(function () {
        // deal with my votes
        App.contracts.Poll.deployed().then(function (instance) {
          var pollInstance = instance;
          return pollInstance.getProposalVoteCountByAddress.call(pId, account);
        }).then(function (votecount) {
          console.log("voted count = " + votecount);
          var pdetail = $('#pdetail');
          pdetail.find('span.pps_my_votes').text(votecount);
          var remain = parseInt(pdetail.find('span.pps_balance').text())- votecount;
          if (remain <= 0 || pclose == true) {
            pdetail.find('span.pps_remain').text(0);
            pdetail.find('#pps_new_vote').val(0);
            pdetail.find('button.pps_vote').disabled = true;
            pdetail.find('button.pps_vote').removeClass('btn-primary').addClass('btn-secondary');
          } else {
            pdetail.find('span.pps_remain').text(remain);
            pdetail.find('#pps_new_vote').val(remain);
            pdetail.find('button.pps_vote').disabled = false;
            pdetail.find('button.pps_vote').removeClass('btn-secondary').addClass('btn-primary');
            $("#pdetail").on('click', '.pps_vote', App.handleVote);
          }
        }).then(function () {
          // show all votes of the proposal
          App.contracts.Poll.deployed().then(function (instance) {
            var pollInstance = instance;
            return pollInstance.getProposalAllVoters.call(pId);
          }).then(function (voters) {
            var vrow = $('#pdetail ul.vt_row');
            vrow.empty();
            var vhead = $('#pdetail ul.vt_head');
            var vtpl = $('#pdetail ul.vt_tpl');
            vrow.append(vhead.html());
            for (var i = 0; i < voters[0].length; i++) {
              /* _owners, _votes */
              vtpl.find('span.vt_seq').text(voters[0].length-i);
              vtpl.find('span.vt_addr').text(voters[0][i]);
              vtpl.find('span.vt_count').text(voters[1][i]);
              vrow.append(vtpl.html());
            }
          });
        });
      });
    });
  },
  loadProposalDetail: function (event) {
    event.preventDefault();
    var pId = parseInt($(event.target).data('id'));
    return App.loadProposalDetailById(pId);
  },

  handleDetailBack: function (event) {
    event.preventDefault();
    $("#pdetail").addClass('d-none');
    $("#plist").removeClass('d-none');
  },

  handleVote: function (event) {
    event.preventDefault();
    var pId = parseInt($('#pdetail span.pps_id').text());
    var pCount = parseInt($('#pps_new_vote').val());
    var pollInstance;
//    console.log(pId + " , "+pCount);
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0];
      App.contracts.Poll.deployed().then(function (instance) {
        pollInstance = instance;
        return pollInstance.vote(pId, pCount, {from: account});
      }).then(function (ret) {
        App.loadOpMessage(true, "执行成功", "成功写入一个区块后，刷新页面即可看到更新后的内容!");
        return App.loadProposalDetailById(pId);
        if (ret >0) {
         // set successful message & reload detail page
        }
      }).catch(function (err) {
        // set failed message & relaod detail page
        console.log(err.message);
      });
    });
  },

  loadAllProposals: function () {
    var pollInstance;
    App.contracts.Poll.deployed().then(function (instance) {
      pollInstance = instance;
      return pollInstance.getAllProposals.call();
    }).then(function (proposals) {
      var pRow = $('#proposalsRow');
      pRow.empty();
      var pTemplate = $('#proposalTemplate');
      for (var i = 0; i < proposals[0].length; i++) {
        /* _ids, _names, _owners, _voteCounts, _tokenAddrs, _totalTokens */
        pTemplate.find('span.pps_id').text(proposals[0][i]);
        pTemplate.find('button.pps_id').attr("data-id", proposals[0][i]);
        pTemplate.find('.pps_name').text(bytes32_to_UTF8(proposals[1][i]));
        pTemplate.find('.pps_vote_amount').text(proposals[3][i]);
        pTemplate.find('.pps_threshold').text(proposals[4][i]);
        pRow.append(pTemplate.html());
      }
      pTemplate.addClass('d-none');
      // set button event again
      $("#plist").on('click', ' button.pps_id', App.loadProposalDetail);
      $('#proposalsRow div').removeClass('d-none');
      $("#plist").removeClass('d-none');
    });
  }
};

$(function () {
  $(window).load(function () {
    $('#new_deadline').jeDate({
      isinitVal:true,
      initDate:[{DD:"+1"},true],
      onClose:false,
      format:"YYYY-MM-DD",
      minDate: $.nowDate({DD:1}) //0代表今天，-1代表昨天，-2代表前天，以此类推
    });
    App.init();
  });
});
