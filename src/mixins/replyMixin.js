import wepy from 'wepy'
import util from '@/utils/util'
import api from '@/utils/api'

export default class ReplyMimin extends wepy.mixin {
  config = {

  }
  data = {
    // 回复数据
    replies: [],
    // 是否有更多数据
    noMoreData: false,
    // 是否在加载中
    isLoading: false,
    // 当前页数
    page: 1
  }
  methods = {
    // 删除回复
    async deleteReply (topicId, replyId) {
      let res = await wepy.showModal({
        title: '确认删除',
        content: '您确认删除该回复吗',
        confirmText: '删除',
        cancelText: '取消'
      })

      // 点击取消后返回
      if (!res.confirm) {
        return
      }

      try {
        // 调用接口删除回复
        let deleteResponse = await api.authRequest({
          url: 'topics/' + topicId + '/replies/' + replyId,
          method: 'DELETE'
        })

        // 删除成功
        if (deleteResponse.statusCode === 204) {
          wepy.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 2000
          })
          // 将删除了的回复移除
          this.replies = this.replies.filter((reply) => reply.id !== replyId)
          this.$apply()
        }

        return deleteResponse
      } catch (err) {
        console.log(err)
        wepy.showModal({
          title: '提示',
          content: '服务器错误，请联系管理员'
        })
      }
    }
  }

  // 获取话题回复
  async getReplies (reset = false) {
    try {
      let that = this
      // 请求话题回复接口
      let repliesResponse = await api.request({
        url: this.requestData.url,
        data: {
          page: this.page,
          include: this.requestData.include || 'user'
        }
      })

      if (repliesResponse.statusCode === 200) {
        let replies = repliesResponse.data.data
        let user = await this.$parent.getCurrentUser()
        // 格式化回复的创建时间
        replies.forEach(function (reply) {
          // 控制是否可以删除
          reply.can_delete = that.canDelete(user, reply)
          reply.created_at_diff = util.diffForHumans(reply.created_at)
        })
        // 如果 reset 不为 ture 则合并 this.replies；否则直接覆盖
        this.replies = reset ? replies : this.replies.concat(replies)

        let pagination = repliesResponse.data.meta.pagination

        // 根据分页数据判断是否有更多数据
        if (pagination.current_page === pagination.total_pages) {
          this.noMoreData = true
        }
        this.$apply()
      }

      return repliesResponse
    } catch (err) {
      console.log(err)
      wepy.showModal({
        title: '提示',
        content: '服务器错误，请联系管理员'
      })
    }
  }

  // 是否可以删除
  canDelete (user, reply) {
    if (!user) {
      return false
    }

    return (reply.user_id === user.id)
  }

  // 下拉刷新
  async onPullDownRefresh() {
    this.noMoreData = false
    this.page = 1
    await this.getReplies(true)
    wepy.stopPullDownRefresh()
  }

  // 上拉到底
  async onReachBottom () {
    // 如果没有更多数据，或者正在加载中，直接返回
    if (this.noMoreData || this.isLoading) {
      return
    }
    this.isLoading = true
    this.page = this.page + 1
    await this.getReplies()
    this.isLoading = false
    this.$apply()
  }


}
